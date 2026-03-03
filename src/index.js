export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle form submissions
    if (url.pathname === '/api/form' && request.method === 'POST') {
      return handleFormSubmit(request, env);
    }

    // Handle CORS preflight for form endpoint
    if (url.pathname === '/api/form' && request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Serve static files (handled by Cloudflare)
    return env.ASSETS.fetch(request);
  },
};

async function handleFormSubmit(request, env) {

  try {
    const formData = await request.formData();

      // Extract form fields
      const fullName = formData.get('kb-field-name') || '';
      const companyName = formData.get('kb-field-company') || '';
      const email = formData.get('kb-field-email') || '';
      const phone = formData.get('kb-field-phone') || '';
      const message = formData.get('kb-field-message') || '';

      // Send email using Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'noreply@thaiustaxrefund.com',
          to: 'admin@aitaxadvisers.com',
          subject: `New Form Submission from ${fullName}`,
          html: `
            <h2>New Form Submission</h2>
            <p><strong>Full Name:</strong> ${escapeHtml(fullName)}</p>
            <p><strong>Company Name:</strong> ${escapeHtml(companyName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.json();
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: error }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Return success response
      return new Response(
        JSON.stringify({ success: true, message: 'Form submitted successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
