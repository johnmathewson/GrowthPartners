"""
Add internal links from service pages to relevant resource pages.
Each service page gets a "Related Guides" section injected before the footer.
"""
import os
import re

base_dir = '/home/ubuntu/site/growth-partners-deploy'

# Map: service page -> list of (resource title, resource URL)
service_to_resources = {
    'services/ai-implementation/index.html': [
        ('AI Consulting vs AI Implementation: What\'s the Difference?', '/pages/resources/ai-consulting-vs-ai-implementation/'),
        ('AI for Lead Response: Small Business Guide', '/pages/resources/ai-for-lead-response-small-business/'),
        ('What to Automate First in Your Small Business', '/pages/resources/what-to-automate-first-small-business/'),
        ('Small Business AI Roadmap: What Good Looks Like', '/pages/resources/small-business-ai-roadmap-what-good-looks-like/'),
    ],
    'services/ai-consulting/index.html': [
        ('AI Consulting Cost vs. Cost of Doing Nothing', '/pages/resources/ai-consulting-cost-vs-cost-of-doing-nothing/'),
        ('What an AI Readiness Assessment Should Actually Cover', '/pages/resources/what-an-ai-readiness-assessment-should-actually-cover/'),
        ('AI Readiness vs Systemization: Which Comes First?', '/pages/resources/ai-readiness-vs-systemization/'),
        ('When AI Implementation Is Not the Right First Step', '/pages/resources/when-ai-implementation-is-not-the-right-first-step/'),
    ],
    'services/ai-crm-automation/index.html': [
        ('Signs Your CRM Is Hurting Your Growth', '/pages/resources/signs-your-crm-is-hurting-growth/'),
        ('AI for Inbound Sales Qualification', '/pages/resources/ai-for-inbound-sales-qualification/'),
        ('AI for Repeat Customer Marketing', '/pages/resources/ai-for-repeat-customer-marketing/'),
        ('AI for Customer Reactivation', '/pages/resources/ai-for-customer-reactivation/'),
    ],
    'services/business-systemization/index.html': [
        ('Signs You Need Better Business Systems', '/resources/signs-you-need-business-systems/'),
        ('How to Clean Up a Workflow Before Automation', '/pages/resources/how-to-clean-up-a-workflow-before-automation/'),
        ('Should You Fix Process Before Buying Software?', '/pages/resources/should-you-fix-process-before-buying-software/'),
        ('AI for Documenting SOPs', '/pages/resources/ai-for-documenting-sops/'),
    ],
    'services/growth-strategy/index.html': [
        ('Small Business AI Roadmap: What Good Looks Like', '/pages/resources/small-business-ai-roadmap-what-good-looks-like/'),
        ('AI for Owner Reporting and Visibility', '/pages/resources/ai-for-owner-reporting-and-visibility/'),
        ('AI for Reporting Dashboards', '/pages/resources/ai-for-reporting-dashboards/'),
        ('Growth Partners vs. Hiring an Operations Manager', '/pages/resources/growth-partners-vs-hiring-operations-manager/'),
    ],
    'services/operations-management/index.html': [
        ('AI for Team Handoffs and Task Routing', '/pages/resources/ai-for-team-handoffs-and-task-routing/'),
        ('AI for Scheduling and Dispatch', '/pages/resources/ai-for-scheduling-and-dispatch/'),
        ('AI for Job Status Updates', '/pages/resources/ai-for-job-status-updates/'),
        ('AI for Internal Knowledge Base', '/pages/resources/ai-for-internal-knowledge-base/'),
    ],
}

RELATED_GUIDES_TEMPLATE = '''
  <!-- Related Guides -->
  <section class="section section-alt">
    <div class="container">
      <h2 style="font-size:1.6rem; font-weight:700; margin-bottom:0.5rem;">Related Guides</h2>
      <p style="color:var(--gray-500); margin-bottom:2rem;">Free resources to help you understand your options before you commit to anything.</p>
      <ul style="list-style:none; padding:0; display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(260px,1fr));">
        {items}
      </ul>
    </div>
  </section>
'''

ITEM_TEMPLATE = '''        <li style="background:var(--white); border:1px solid var(--gray-200); border-radius:8px; padding:1.25rem 1.5rem;">
          <a href="{url}" style="font-weight:600; color:var(--teal); text-decoration:none; font-size:0.95rem;">{title} &rarr;</a>
        </li>'''

updated = 0
for rel_path, resources in service_to_resources.items():
    full_path = os.path.join(base_dir, rel_path)
    if not os.path.exists(full_path):
        print(f"SKIP (not found): {rel_path}")
        continue

    with open(full_path, 'r') as f:
        content = f.read()

    # Don't add if already has related guides
    if 'Related Guides' in content:
        print(f"SKIP (already has related guides): {rel_path}")
        continue

    items_html = '\n'.join([ITEM_TEMPLATE.format(url=url, title=title) for title, url in resources])
    section_html = RELATED_GUIDES_TEMPLATE.format(items=items_html)

    # Insert before the footer
    if '<footer' in content:
        content = content.replace('<footer', section_html + '\n  <footer', 1)
        with open(full_path, 'w') as f:
            f.write(content)
        print(f"Updated: {rel_path}")
        updated += 1
    else:
        print(f"SKIP (no footer found): {rel_path}")

print(f"\nTotal updated: {updated}")
