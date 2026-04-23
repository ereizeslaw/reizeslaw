# Reizes Law Firm - The Fed Guy

Official website for **Reizes Law Firm**, specializing in Federal Employment Law. 
Live site: [https://reizeslaw.com](https://reizeslaw.com)

## 🚀 Tech Stack
- **Frontend:** Vanilla HTML5, CSS3 (Modern Flexbox/Grid), JavaScript (ES6+)
- **SEO/Metadata:** JSON-LD Schema.org (LegalService, FAQ, Breadcrumbs), OpenGraph, Twitter Cards
- **Analytics:** Google Analytics 4 (Custom event tracking for phone/email clicks)
- **Forms:** Web3Forms (Serverless contact form)
- **Hosting:** GitHub Pages

## 📁 Project Structure
- `/index.html` - Homepage & Core content
- Practice area sub-folders (one per `<li>` in the Expertise dropdown):
  - `/discipline/` - Progressive discipline (LOCs, LORs, PIPs)
  - `/removals/` - Federal removals
  - `/suspensions/` - Short, long, and indefinite suspensions
  - `/mspb-appeals/` - MSPB appeal procedure (jurisdictional hub)
  - `/fers-disability-retirement/` - FERS disability retirement
  - `/whistleblower-protection/` - Whistleblower retaliation
  - `/eeo-discrimination/` - EEO and workplace discrimination
- `/privacy/` - Privacy policy
- `/404.html` - Not-found page
- `/assets/` - Shared CSS, JS, images
- `sitemap.xml` & `robots.txt` - Search engine instructions
- `CNAME` - Custom domain configuration

## 🛠 Maintenance & Updates
1. **To update phone numbers:** Check both the visible text and the `href="tel:+1..."` attributes across all HTML files.
2. **SEO Changes:** Update the JSON-LD `<script>` blocks in `index.html`.
3. **Tracking:** Analytics logic is located in `/assets/js/analytics.js`.

## 📦 Deployment
Deployments are automated via GitHub Pages. 
Any push to the `main` branch will trigger a rebuild and update the live site.