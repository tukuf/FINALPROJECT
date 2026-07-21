import { useState } from "react";
import MainLayout from "../layout/MainLayout";
import "../styles/contactus.css";

function ContactUs() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWhatsAppSend = () => {
    const { firstName, lastName, email, message } = formData;
    const fullName = `${firstName} ${lastName}`.trim();
    const text = `Hello Virtual House Renting Team,

My name is ${fullName || "N/A"}.
Email: ${email || "N/A"}

${message || "I would like to get in touch."}

Sent from the Virtual House Renting Contact page.`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/255776585347?text=${encoded}`, "_blank");
  };

  return (
    <MainLayout role={JSON.parse(localStorage.getItem("user") || "{}").role || "CLIENT"}>
      <div className="contact-page">
        {/* Hero Header */}
        <div className="contact-hero">
          <div className="contact-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            We're Here to Help
          </div>
          <h1>
            Get in <span>Touch</span> with Us
          </h1>
          <p>
            Have a question about a property, need assistance with your rental,
            or just want to say hello? We'd love to hear from you.
          </p>
        </div>

        {/* Two-Column Grid */}
        <div className="contact-grid">
          {/* Left: Contact Information */}
          <div className="contact-card contact-info-card animate-fade-in-left">
            <div className="contact-info-header">
              <h2>Contact Information</h2>
              <p>
                Reach out through any of the channels below. Our team is
                ready to assist you with all your rental needs.
              </p>
            </div>

            <div className="contact-items">
              {/* Location */}
              <div className="contact-item">
                <div className="contact-item-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="contact-item-content">
                  <div className="contact-item-label">Location</div>
                  <div className="contact-item-value">Zanzibar, Tanzania</div>
                </div>
              </div>

              {/* Phone */}
              <div className="contact-item">
                <div className="contact-item-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="contact-item-content">
                  <div className="contact-item-label">Phone Number</div>
                  <div className="contact-item-value">
                    <a href="tel:+255776585347">+255 776 585 347</a>
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="contact-item">
                <div className="contact-item-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div className="contact-item-content">
                  <div className="contact-item-label">WhatsApp</div>
                  <div className="contact-item-value">
                    <a
                      href="https://wa.me/255776585347"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      +255 776 585 347
                    </a>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="contact-item">
                <div className="contact-item-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="contact-item-content">
                  <div className="contact-item-label">Email</div>
                  <div className="contact-item-value">
                    <a href="mailto:info@virtualhouserenting.co.tz">
                      info@virtualhouserenting.co.tz
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="contact-social-section">
              <div className="contact-social-label">Follow Us</div>
              <div className="contact-social-icons">
                {/* WhatsApp */}
                <a
                  className="contact-social-link"
                  href="https://wa.me/255776585347"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  className="contact-social-link"
                  href="https://instagram.com/tukuf_jr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
                  </svg>
                </a>

                {/* Facebook */}
                <a
                  className="contact-social-link"
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  className="contact-social-link"
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="contact-card contact-form-card animate-fade-in-up delay-2">
            <div className="contact-form-header">
              <h2>Send a Message</h2>
              <p>
                Fill out the form below and send us a message via WhatsApp.
                We typically respond within minutes during business hours.
              </p>
            </div>

            <div className="contact-form">
              <div className="contact-form-row">
                <div className="contact-field">
                  <label htmlFor="contact-firstName">First Name</label>
                  <input
                    type="text"
                    id="contact-firstName"
                    name="firstName"
                    placeholder="Ashraf"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-lastName">Last Name</label>
                  <input
                    type="text"
                    id="contact-lastName"
                    name="lastName"
                    placeholder="othman"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="contact-email">Email Address</label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  placeholder="ashraf@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="contact-field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Tell us how we can help you..."
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>

              <button
                className="contact-whatsapp-btn"
                type="button"
                onClick={handleWhatsAppSend}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Send via WhatsApp
              </button>
            </div>

            <div className="contact-decor">
              <span className="contact-decor-dot" />
              <span className="contact-decor-text">
                Virtual House Renting &mdash; Zanzibar, Tanzania
              </span>
              <span className="contact-decor-dot" />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default ContactUs;
