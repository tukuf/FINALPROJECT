"""
Custom middleware to fix two issues that cause the Marzipano 360° viewer
to show a black screen:

1. CORS headers on /media/ responses.
   Django's dev server bypasses django-cors-headers for media files.
   Without Access-Control-Allow-Origin, the browser marks the image as
   "tainted" and WebGL refuses to use it as a texture.

2. Cross-Origin-Opener-Policy removal from /media/ responses.
   Django's SecurityMiddleware adds Cross-Origin-Opener-Policy: same-origin.
   When this is present on the *image* response, Chromium-based browsers
   block the image from being used as a WebGL texture, causing a black screen.

3. 127.0.0.1 → localhost URL rewriting in JSON API responses.
   Django's request.build_absolute_uri() uses the raw server socket address
   (127.0.0.1), but the browser origin is localhost:3000. Marzipano probes
   the image with crossOrigin='anonymous'; if the host differs the browser
   treats it as strictly cross-origin and WebGL may refuse the texture.
   Rewriting image_url values to use localhost keeps everything same-host.
"""




class MediaCorsMiddleware:
    """
    Fixes CORS / WebGL texture loading for /media/ files and JSON responses.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # ── Fix 1 & 2: media file responses ──────────────────────────────────
        if request.path.startswith("/media/"):
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            # Remove COOP – it blocks WebGL from using the image as a texture
            if "Cross-Origin-Opener-Policy" in response:
                del response["Cross-Origin-Opener-Policy"]
            if "Cross-Origin-Embedder-Policy" in response:
                del response["Cross-Origin-Embedder-Policy"]

        # ── Fix 3: rewrite 127.0.0.1 → localhost in JSON bodies ─────────────
        content_type = response.get("Content-Type", "")
        if "application/json" in content_type:
            try:
                content = response.content.decode("utf-8")
                if "127.0.0.1" in content:
                    content = content.replace(
                        "http://127.0.0.1:8000", "http://localhost:8000"
                    )
                    response.content = content.encode("utf-8")
            except Exception:
                pass  # Never break the response; silently skip on error

        return response
