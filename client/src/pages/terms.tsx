import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 5, 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using The Medicine & Money Show thumbnail generator and content creation platform 
              ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to 
              these Terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              The Medicine & Money Show provides a web-based platform for creating YouTube thumbnails, managing 
              social media content, analyzing trends, and optimizing video metadata. The Service includes features 
              such as AI-powered background generation, template libraries, batch exports, and social media scheduling.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
            <h3 className="text-lg font-medium mb-2">3.1 Account Creation</h3>
            <p className="mb-4">
              To use certain features of the Service, you must create an account by signing in through Google, 
              GitHub, or Apple. You are responsible for maintaining the confidentiality of your account credentials.
            </p>

            <h3 className="text-lg font-medium mb-2">3.2 Account Responsibilities</h3>
            <ul className="list-disc pl-6">
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for all activities under your account</li>
              <li>You must notify us immediately of any unauthorized use</li>
              <li>You must be at least 13 years old to use the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Upload or distribute malicious code or viruses</li>
              <li>Harass, abuse, or harm others</li>
              <li>Create misleading, fraudulent, or deceptive content</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Intellectual Property</h2>
            <h3 className="text-lg font-medium mb-2">5.1 Our Content</h3>
            <p className="mb-4">
              The Service, including its original content, features, and functionality, is owned by The Medicine & 
              Money Show and is protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-lg font-medium mb-2">5.2 Your Content</h3>
            <p className="mb-4">
              You retain ownership of content you create using the Service. By using the Service, you grant us a 
              non-exclusive, worldwide, royalty-free license to use, store, and display your content solely for 
              the purpose of providing the Service.
            </p>

            <h3 className="text-lg font-medium mb-2">5.3 User Representations</h3>
            <p>
              You represent that you have all necessary rights to any content you upload and that such content 
              does not infringe on third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Third-Party Services</h2>
            <p>
              The Service may integrate with third-party services including YouTube, social media platforms, and 
              Go High Level. Your use of these integrations is subject to the respective third-party terms and 
              privacy policies. We are not responsible for the practices of third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. AI-Generated Content</h2>
            <p>
              The Service uses artificial intelligence to generate backgrounds, optimize content, and provide 
              suggestions. You acknowledge that AI-generated content may not always be accurate or appropriate. 
              You are responsible for reviewing and approving all content before publishing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
              OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. WE 
              DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
              PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE MEDICINE & MONEY SHOW SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, 
              DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless The Medicine & Money Show and its affiliates, officers, 
              directors, employees, and agents from any claims, damages, losses, or expenses arising from your 
              use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service immediately, without prior 
              notice, for any reason, including breach of these Terms. Upon termination, your right to use 
              the Service will cease immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of any changes by 
              posting the new Terms on this page. Your continued use of the Service after changes constitutes 
              acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States, 
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">14. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              <strong>The Medicine & Money Show</strong><br />
              Email: legal@medicineandmoneyshow.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
