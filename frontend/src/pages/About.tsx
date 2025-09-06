import { Users, Target, Heart, Shield } from 'lucide-react'

const About = () => {
  const values = [
    {
      icon: <Heart className="h-8 w-8 text-primary-600" />,
      title: 'Love',
      description: 'We operate with unconditional love and acceptance for all.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary-600" />,
      title: 'Community',
      description: 'Building strong, supportive relationships within our group.',
    },
    {
      icon: <Target className="h-8 w-8 text-primary-600" />,
      title: 'Purpose',
      description: 'Helping others find meaning and direction in their lives.',
    },
    {
      icon: <Shield className="h-8 w-8 text-primary-600" />,
      title: 'Safety',
      description: 'Providing secure and reliable transportation services.',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      {/* Mission Section */}
      <section className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About The Bible Bus</h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          The Bible Bus is more than just a transportation service – it's a community
          initiative dedicated to bringing people together through faith, fellowship,
          and service. Our mission is to create meaningful connections while providing
          safe and reliable transportation for our community members.
        </p>
      </section>

      {/* Story Section */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
        <div className="space-y-4 text-gray-600 leading-relaxed">
          <p>
            Founded in 2024, The Bible Bus began as a simple idea: what if we could
            combine practical transportation needs with spiritual community building?
            What started as a small group of friends has grown into a vibrant
            community that serves hundreds of people each month.
          </p>
          <p>
            We believe that every journey is an opportunity for connection, growth,
            and service. Whether it's a ride to church, a community event, or a
            simple errand, we see each trip as a chance to build relationships and
            share God's love.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {values.map((value, index) => (
            <div key={index} className="card">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">{value.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Section */}
      <section className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Impact</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary-600 mb-2">500+</div>
            <div className="text-gray-600">Community Members Served</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600 mb-2">50+</div>
            <div className="text-gray-600">Weekly Trips</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600 mb-2">100%</div>
            <div className="text-gray-600">Safety Record</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
