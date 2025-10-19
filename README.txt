QUICK DEPLOY (Netlify)

1) Go to https://app.netlify.com/drop and drag the entire folder you downloaded here.
   - Make sure index.html is at the root level.
   - Netlify will give you a temporary *.netlify.app URL.

2) Set your custom domain (YOURDOMAIN.com):
   - In your new site's settings: Domain management → Add custom domain → enter YOURDOMAIN.com.
   - Follow Netlify's DNS prompt:
     • If your domain is at GoDaddy/Namecheap/Cloudflare: add a CNAME for www → yoursite.netlify.app and an ALIAS/ANAME or A/AAAA records for apex.
     • Or switch nameservers to Netlify DNS and let Netlify create records for you.

3) Enable HTTPS:
   - After DNS propagates, click "Verify DNS configuration" then "Provision certificate" (Let's Encrypt).

4) Update placeholders:
   - Edit index.html, robots.txt, sitemap.xml to replace YOURDOMAIN.com and add your favicon (favicon.ico) and og-image.jpg.
   - Re-deploy by dragging the updated folder again (or connect a Git repo).

5) Optional (advanced):
   - Keep netlify.toml for security headers.
   - Connect a Git repo for continuous deploys.
