import os
import shutil

base_dir = '/home/ubuntu/site/growth-partners-deploy'

# We'll use an existing resource page as a template
template_path = os.path.join(base_dir, 'pages/resources/ai-for-lead-response-small-business/index.html')
with open(template_path, 'r') as f:
    template_content = f.read()

# Pages to create
new_pages = [
    {
        'path': 'pages/resources/ai-consultant-northwest-indiana',
        'title': 'AI Consultant in Northwest Indiana | Growth Partners',
        'h1': 'AI Consulting for Northwest Indiana Businesses',
        'content': '''
        <p>As an <strong>AI consultant in Northwest Indiana</strong>, Growth Partners helps local service businesses implement artificial intelligence to save time, capture more leads, and automate daily operations.</p>
        <h2>Why Hire a Local AI Consultant?</h2>
        <p>While many AI agencies operate entirely online, there is immense value in working with a consultant who understands the local NWI market. We work with businesses in Hobart, Merrillville, Valparaiso, Crown Point, and surrounding areas to build systems that actually work for the trades, home services, and professional services.</p>
        <h2>What Does an AI Consultant Do?</h2>
        <ul>
            <li><strong>Assess Your Operations:</strong> We look at how you currently run your business to identify bottlenecks.</li>
            <li><strong>Recommend the Right Tools:</strong> Not every business needs custom AI. Sometimes, you just need the right off-the-shelf software configured correctly.</li>
            <li><strong>Build and Implement:</strong> We build custom lead capture systems, automated follow-up sequences, and smart quoting tools.</li>
            <li><strong>Train Your Team:</strong> A tool is only useful if your team actually uses it. We provide training and ongoing support.</li>
        </ul>
        <h2>Ready to Systemize Your Business?</h2>
        <p>If you're an owner-operator in Northwest Indiana looking to scale without working more hours, let's talk. Book a free consultation today.</p>
        '''
    },
    {
        'path': 'pages/resources/small-business-consulting-nwi',
        'title': 'Small Business Consulting NWI | Growth Partners',
        'h1': 'Small Business Consulting in Northwest Indiana',
        'content': '''
        <p>Growth Partners provides <strong>small business consulting in NWI</strong> for service-based businesses that want to scale, systemize, and increase profitability.</p>
        <h2>More Than Just Advice</h2>
        <p>Traditional business consultants give you a binder full of advice and leave you to figure out the implementation. We do things differently. We don't just tell you what to do; we build the systems, implement the technology, and train your team.</p>
        <h2>Areas of Focus</h2>
        <ul>
            <li><strong>Operations Management:</strong> Documenting SOPs and streamlining daily workflows.</li>
            <li><strong>Financial Organization:</strong> Getting clarity on your numbers, job costing, and cash flow.</li>
            <li><strong>Hiring & Team Building:</strong> Creating systems to attract, train, and retain good employees.</li>
            <li><strong>AI & Automation:</strong> Leveraging technology to do the heavy lifting so you don't have to.</li>
        </ul>
        <h2>Local Expertise for NWI Businesses</h2>
        <p>Based in Hobart, IN, we understand the unique challenges and opportunities of operating a business in Northwest Indiana. Whether you're in Lake or Porter County, we're here to help you grow smarter.</p>
        '''
    },
    {
        'path': 'pages/resources/faq',
        'title': 'Frequently Asked Questions | Growth Partners',
        'h1': 'Frequently Asked Questions',
        'content': '''
        <p>Find answers to common questions about our AI consulting, business systemization, and implementation services.</p>
        
        <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <h3 itemprop="name">What kind of businesses do you work with?</h3>
            <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <div itemprop="text">
                    <p>We work primarily with service businesses under 25 employees in Northwest Indiana. This includes plumbers, HVAC technicians, cleaners, roofers, landscapers, property managers, and professional services.</p>
                </div>
            </div>
        </div>

        <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <h3 itemprop="name">How fast do you deliver custom AI tools?</h3>
            <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <div itemprop="text">
                    <p>Your first custom tool is typically live within 5-7 business days. We focus on rapid implementation so you can start seeing a return on your investment immediately.</p>
                </div>
            </div>
        </div>

        <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <h3 itemprop="name">Do I need to be tech-savvy?</h3>
            <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <div itemprop="text">
                    <p>Not at all. We build tools that are simple by design. We handle all the technical setup, integration, and testing, and then train you and your team on how to use the finished product.</p>
                </div>
            </div>
        </div>

        <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <h3 itemprop="name">What is the cost of your services?</h3>
            <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <div itemprop="text">
                    <p>Our Starter Build is currently $2,500 (normally $5,000). This includes one custom AI tool built for your business, live in a week, with 90 days of hosting and support. We also offer ongoing monthly plans for continuous improvement.</p>
                </div>
            </div>
        </div>
        
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [{
            "@type": "Question",
            "name": "What kind of businesses do you work with?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We work primarily with service businesses under 25 employees in Northwest Indiana. This includes plumbers, HVAC technicians, cleaners, roofers, landscapers, property managers, and professional services."
            }
          }, {
            "@type": "Question",
            "name": "How fast do you deliver custom AI tools?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Your first custom tool is typically live within 5-7 business days. We focus on rapid implementation so you can start seeing a return on your investment immediately."
            }
          }, {
            "@type": "Question",
            "name": "Do I need to be tech-savvy?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Not at all. We build tools that are simple by design. We handle all the technical setup, integration, and testing, and then train you and your team on how to use the finished product."
            }
          }, {
            "@type": "Question",
            "name": "What is the cost of your services?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Our Starter Build is currently $2,500 (normally $5,000). This includes one custom AI tool built for your business, live in a week, with 90 days of hosting and support. We also offer ongoing monthly plans for continuous improvement."
            }
          }]
        }
        </script>
        '''
    },
    {
        'path': 'pages/resources/growth-partners-vs-hiring-operations-manager',
        'title': 'Growth Partners vs Hiring an Operations Manager | Comparison',
        'h1': 'Growth Partners vs. Hiring a Full-Time Operations Manager',
        'content': '''
        <p>When a service business owner starts drowning in administrative work, the instinct is usually to hire an operations manager or an executive assistant. While hiring is eventually necessary, it is often the wrong first step. Here is a comparison of hiring an operations manager versus partnering with Growth Partners to build AI systems.</p>
        
        <h2>The Cost Comparison</h2>
        <p>A competent operations manager in Northwest Indiana will cost between $60,000 and $85,000 per year in salary alone, plus benefits, taxes, and training time. Growth Partners' Starter Build is a one-time investment of $2,500, with optional ongoing support that costs a fraction of a full-time employee.</p>
        
        <h2>Speed to Value</h2>
        <p>Hiring takes months. You have to write a job description, interview candidates, make an offer, and then spend 3-6 months training them on your messy, undocumented processes. Growth Partners delivers your first working, automated system in 5-7 business days.</p>
        
        <h2>Fixing the Root Cause</h2>
        <p>If you hire an operations manager to run a broken system, you just have a very expensive person running a broken system. Growth Partners fixes the root cause by documenting your workflows, eliminating unnecessary steps, and automating the repetitive tasks.</p>
        
        <h2>When You Should Hire</h2>
        <p>We are not anti-employee. In fact, one of our core services is helping you build a hiring system. But you should hire people to do high-value work—managing client relationships, ensuring quality control, and driving strategy—not to manually copy data between spreadsheets or send reminder emails. Build the systems first, then hire people to run them.</p>
        '''
    }
]

import re

for page in new_pages:
    dir_path = os.path.join(base_dir, page['path'])
    os.makedirs(dir_path, exist_ok=True)
    
    # Replace title
    content = re.sub(r'<title>.*?</title>', f'<title>{page["title"]}</title>', template_content)
    
    # Replace canonical
    canonical_url = f'https://mygrowthconsultants.com/{page["path"]}/'
    content = re.sub(r'<link rel="canonical" href=".*?">', f'<link rel="canonical" href="{canonical_url}">', content)
    
    # Replace h1
    content = re.sub(r'<h1 class="hero-title">.*?</h1>', f'<h1 class="hero-title">{page["h1"]}</h1>', content)
    
    # Replace main content
    # Find the article-content div
    content_start = content.find('<div class="article-content">')
    if content_start != -1:
        content_end = content.find('</div>', content_start)
        if content_end != -1:
            # We need to find the matching closing div for article-content, which might be tricky with nested divs
            # For simplicity, we'll just replace the content using regex
            content = re.sub(r'<div class="article-content">.*?</div>\s*<!-- Author Bio -->', 
                             f'<div class="article-content">\n{page["content"]}\n</div>\n<!-- Author Bio -->', 
                             content, flags=re.DOTALL)
            
    # Write the new file
    file_path = os.path.join(dir_path, 'index.html')
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Created: {file_path}")

print("Done generating pages.")
