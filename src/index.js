export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/presignup" && request.method === "POST") {
      try {
        const body = await request.json();

        const firstName = body.first_name?.trim();
        const lastName = body.last_name?.trim();
        const email = body.email?.trim().toLowerCase();
        const phone = body.phone?.trim() || null;
        const interestedIn = body.interested_in?.trim();
        const howCanWeHelp = body.how_can_we_help?.trim() || null;

        if (!firstName || !lastName || !email || !interestedIn) {
          return Response.json(
            { success: false, error: "Missing required fields" },
            { status: 400 }
          );
        }

        const result = await env.DB.prepare(
          `INSERT INTO presignups
           (first_name, last_name, email, phone, interested_in, how_can_we_help)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            firstName,
            lastName,
            email,
            phone,
            interestedIn,
            howCanWeHelp
          )
          .run();

        return Response.json({
          success: true,
          id: result.meta.last_row_id
        });

      } catch (error) {
        console.error(error);

        return Response.json(
          { success: false, error: "Unable to submit inquiry" },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
