import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center">Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-gray-600 text-center">
              Last updated: {new Date().toLocaleDateString()}
            </div>
            
            <div className="space-y-4">
              <section>
                <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
                <p className="text-gray-700">
                  By accessing and using Family Tree App, you agree to be bound by these Terms and Conditions 
                  and all applicable laws and regulations.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">2. User Account</h2>
                <p className="text-gray-700">
                  You are responsible for maintaining the confidentiality of your account credentials and 
                  for all activities that occur under your account.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">3. Family Data</h2>
                <p className="text-gray-700">
                  You retain ownership of the family information you provide. By using our service, you grant 
                  us permission to store and process this information to provide our services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">4. Privacy</h2>
                <p className="text-gray-700">
                  We respect your privacy and are committed to protecting your personal information. 
                  Family trees and member information are only accessible to authorized family members.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">5. AI Services</h2>
                <p className="text-gray-700">
                  Our AI chatbot feature is designed to help with family history questions. AI responses 
                  are generated based on your family data and should be verified for accuracy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">6. Prohibited Uses</h2>
                <p className="text-gray-700">
                  You may not use our service for any unlawful purpose, to harm others, or to violate 
                  the rights of other users.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">7. Service Availability</h2>
                <p className="text-gray-700">
                  While we strive to maintain continuous service, we do not guarantee uninterrupted access 
                  and may perform maintenance that temporarily affects availability.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">8. Modifications</h2>
                <p className="text-gray-700">
                  We reserve the right to modify these terms at any time. Users will be notified of 
                  significant changes to these terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">9. Contact Information</h2>
                <p className="text-gray-700">
                  If you have any questions about these Terms and Conditions, please contact our support team.
                </p>
              </section>
            </div>

            <div className="flex justify-center space-x-4 pt-8">
              <Button variant="outline" asChild>
                <Link href="/signup">Back to Sign Up</Link>
              </Button>
              <Button asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
