import { useState } from 'react'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    
    alert('Thank you for your message! We will get back to you soon.')
    setFormData({ name: '', email: '', phone: '', message: '' })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const contactInfo = [
    {
      icon: <Mail className="h-6 w-6 text-primary-600" />,
      title: 'Email',
      content: 'info@thebiblebus.com',
      link: 'mailto:info@thebiblebus.com',
    },
    {
      icon: <Phone className="h-6 w-6 text-primary-600" />,
      title: 'Phone',
      content: '(555) 123-4567',
      link: 'tel:+15551234567',
    },
    {
      icon: <MapPin className="h-6 w-6 text-primary-600" />,
      title: 'Address',
      content: '123 Faith Street, Community City, CC 12345',
      link: '#',
    },
    {
      icon: <Clock className="h-6 w-6 text-primary-600" />,
      title: 'Hours',
      content: 'Monday - Friday: 8 AM - 6 PM',
      link: '#',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-16">
      {/* Header */}
      <section className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-xl text-gray-600">
          Have questions or need assistance? We'd love to hear from you!
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-16">
        {/* Contact Form */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={4}
                value={formData.message}
                onChange={handleChange}
                className="input-field resize-none"
                placeholder="Tell us how we can help you..."
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Send Message
            </button>
          </form>
        </section>

        {/* Contact Information */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          <div className="space-y-6">
            {contactInfo.map((info, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">{info.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {info.title}
                  </h3>
                  {info.link !== '#' ? (
                    <a
                      href={info.link}
                      className="text-primary-600 hover:text-primary-700 transition-colors duration-200"
                    >
                      {info.content}
                    </a>
                  ) : (
                    <p className="text-gray-600">{info.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-6 bg-gray-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Emergency Contact
            </h3>
            <p className="text-gray-600 mb-3">
              For urgent transportation needs outside of regular hours, please call our
              emergency line:
            </p>
            <a
              href="tel:+15551234567"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              (555) 987-6543
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Contact
