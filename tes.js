export const handler = async (event, context) => {
  try {
    const request = event.Records[0].cf.request;
    const uri = request.uri; // Get the request URI/path
    const headers = request.headers || {};

    // Define the path pattern to exclude from authentication
    // Use a regular expression or simple String.prototype.startsWith() for matching
    const excludedPath = "/workspace/public/agent-chat/";

    // --- CHECK FOR EXCLUDED PATH ---
    // If the URI starts with the excluded path, bypass authentication and proceed.
    if (uri.startsWith(excludedPath)) {
      console.log(`Bypassing authentication for excluded path: ${uri}`);
      return request; // authorized — forward request to origin
    }
    // -------------------------------

    // <-- configure users here (or use env var version below) -->
    const users = {
      user: "pass",
      Vendor: "Vendortester",
    };
    const authHeader =
      headers.authorization &&
      headers.authorization[0] &&
      headers.authorization[0].value;
    // build allowed Basic strings
    const allowed = Object.entries(users).map(
      ([u, p]) => "Basic " + Buffer.from(`${u}:${p}`).toString("base64")
    );
    if (!authHeader || !allowed.includes(authHeader)) {
      // Return 401 to trigger browser basic auth prompt
      return {
        status: "401",
        statusDescription: "Unauthorized",
        headers: {
          "www-authenticate": [
            { key: "WWW-Authenticate", value: 'Basic realm="Restricted Area"' },
          ],
          "content-type": [
            { key: "Content-Type", value: "text/plain; charset=utf-8" },
          ],
        },
        body: "Unauthorized",
      };
    }

    // authorized — forward request to origin
    return request;
  } catch (err) {
    // Log to CloudWatch (visible in the CloudWatch region where the edge ran)
    console.error("Lambda@Edge error", err);
    // Return 500 to CloudFront (or you can return 401 if you prefer)
    return {
      status: "500",
      statusDescription: "Internal Server Error",
      headers: {
        "content-type": [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
        ],
      },
      body: "Internal Server Error",
    };
  }
};
