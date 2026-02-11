import Link from "next/link"

const LandingPage = () => {
  return (
    <div className="relative min-h-screen bg-white">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #377CF8 1px, transparent 1px),
            linear-gradient(to bottom, #377CF8 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} 
      />
      
      {/* Content */}
      <div className="relative">
        <HeroSection />
        <HowItWorksSection />
      </div>
    </div>
  )
}

// Hero Section
const HeroSection = () => {
  return (
    <div className="landing_container pt-20 pb-32">
      <div className='flex flex-col lg:flex-row items-center justify-between w-full gap-10'>
        {/* Left side */}
        <div className="flex-1">
          <div className="font-roboto font-bold text-6xl lg:text-7xl flex flex-col gap-4">
            <span className="text-gray-900">Find the Gaps.</span>
            <span className="text-blue-600">Fill the Gaps.</span>
          </div>
          <p className="font-roboto font-extralight text-base lg:text-lg pt-5 text-gray-600 max-w-2xl">
            Know Your Weak Spots Before Recruiters Do with our AI powered Resume Analyzer and Builder. Don't let a paper decide how capable you are.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex gap-4 pt-8">
            <Link 
              className="font-comfortaa bg-blue-600 text-white px-8 py-4 rounded-lg hover:opacity-90 hover:scale-105 transition-all duration-300"  
              href={"/analyzer"}
            >
              Get Started
            </Link>
            
            <Link href="/chat" className="font-comfortaa border-2 border-blue-200 text-gray-900 px-8 py-4 rounded-lg hover:bg-blue-50 hover:scale-105 transition-all duration-300">
             Discuss your Resume
            </Link>
          </div>
        </div>
        
        {/* Right side - Simple Card */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="bg-white/60 backdrop-blur-lg border border-blue-200 shadow-xl p-8 rounded-2xl max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-roboto text-gray-600">AI Analysis Active</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2 font-roboto">
                  <span className="text-gray-700">ATS Compatibility</span>
                  <span className="font-bold text-gray-900">92%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2 font-roboto">
                  <span className="text-gray-700">Keyword Match</span>
                  <span className="font-bold text-gray-900">78%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2 font-roboto">
                  <span className="text-gray-700">Format Score</span>
                  <span className="font-bold text-gray-900">85%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-roboto text-gray-700">
                <span className="font-bold text-blue-600">💡 AI Insight:</span> Add 3 more industry keywords to boost visibility
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-24">
        <div className="text-center bg-white/60 backdrop-blur-lg border border-blue-200 shadow-lg p-6 rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer">
          <div className="text-4xl font-bold text-blue-600 font-roboto">CV</div>
          <div className="text-sm text-gray-600 font-roboto mt-2">Helps Job Seekers</div>
        </div>
        <div className="text-center bg-white/60 backdrop-blur-lg border border-blue-200 shadow-lg p-6 rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer">
          <div className="text-4xl font-bold text-blue-600 font-roboto">98%</div>
          <div className="text-sm text-gray-600 font-roboto mt-2">Accuracy Rate</div>
        </div>
        <div className="text-center bg-white/60 backdrop-blur-lg border border-blue-200 shadow-lg p-6 rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer">
          <div className="text-4xl font-bold text-blue-600 font-roboto">&lt;10s</div>
          <div className="text-sm text-gray-600 font-roboto mt-2">Analysis Time</div>
        </div>
        <div className="text-center bg-white/60 backdrop-blur-lg border border-blue-200 shadow-lg p-6 rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer">
          <div className="text-4xl font-bold text-blue-600 font-roboto">10+</div>
          <div className="text-sm text-gray-600 font-roboto mt-2">ATS Systems Supported</div>
        </div>
      </div>
    </div>
  )
}

// How It Works Section
const HowItWorksSection = () => {
  const steps = [
    {
      number: '01',
      title: 'Upload Your Resume',
      description: 'Drag and drop your current resume. We support PDF, DOCX, and TXT formats.'
    },
    {
      number: '02',
      title: 'AI Analysis',
      description: 'Our AI scans for ATS compatibility, keywords, and formatting issues instantly.'
    },
    {
      number: '03',
      title: 'Get Insights',
      description: 'Receive detailed feedback with actionable recommendations and improvements.'
    },
    {
      number: '04',
      title: 'Apply & Succeed',
      description: 'Download your optimized resume and track your application success rate.'
    }
  ]
  
  return (
    <div className="landing_container py-24">
      <div className="text-center mb-16">
        <h2 className="text-5xl font-bold font-roboto mb-4 text-gray-900">
          How It Works
        </h2>
        <p className="text-gray-600 font-roboto text-lg max-w-2xl mx-auto">
          Four simple steps to transform your resume
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-lg border border-blue-200 shadow-lg p-6 rounded-xl hover:scale-105 transition-transform duration-300 cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl font-roboto mb-6">
              {step.number}
            </div>
            
            <h3 className="text-xl font-bold font-roboto mb-3 text-gray-900">
              {step.title}
            </h3>
            <p className="text-gray-600 font-roboto text-sm">
              {step.description}
            </p>
          </div>
        ))}
      </div>
      
      {/* Final CTA */}
      <div className="mt-20 text-center">
        <div className="bg-white/60 backdrop-blur-lg border border-blue-200 shadow-xl p-12 rounded-2xl max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold font-roboto mb-4 text-gray-900">
            Ready to Transform Your Resume?
          </h3>
          <p className="text-gray-600 font-roboto mb-8 text-lg">
            Join thousands of professionals who've landed their dream jobs
          </p>
          <Link 
            className="inline-block font-comfortaa bg-blue-600 text-white px-10 py-5 rounded-lg text-lg hover:opacity-90 hover:scale-105 transition-all duration-300"  
            href={"/analyzer"}
          >
            Get Started Now - It's Free
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LandingPage