import React, { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function Contact() {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert(t("contact_success"));
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const faqItems = [
    { question: t("contact_faq_1_q"), answer: t("contact_faq_1_a") },
    { question: t("contact_faq_2_q"), answer: t("contact_faq_2_a") },
    { question: t("contact_faq_3_q"), answer: t("contact_faq_3_a") },
    { question: t("contact_faq_4_q"), answer: t("contact_faq_4_a") },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-4">{t("contact_title")}</h1>
          <p className="text-xl">{t("contact_subtitle")}</p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t("phone")}</h3>
                  <p className="text-gray-600">(216) 20 xxx xxx</p>
                  <p className="text-sm text-gray-500 mt-1">{t("contact_phone_hours")}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t("email")}</h3>
                  <p className="text-gray-600">contact@smarttravel.tn</p>
                  <p className="text-sm text-gray-500 mt-1">{t("contact_email_delay")}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t("address")}</h3>
                  <p className="text-gray-600">
                    Gabès, Tunisie
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t("contact_hours_label")}</h3>
                  <p className="text-gray-600" style={{ whiteSpace: "pre-line" }}>
                    {t("contact_hours_detail")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl p-8 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("contact_send_message")}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      {t("contact_fullname")} *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      {t("email")} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="jean.dupont@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      {t("phone")}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(216) 20 123 456"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      {t("contact_subject")} *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t("contact_subject_placeholder")}</option>
                      <option value="devis">{t("contact_subject_quote")}</option>
                      <option value="info">{t("contact_subject_info")}</option>
                      <option value="reservation">{t("contact_subject_booking")}</option>
                      <option value="reclamation">{t("contact_subject_complaint")}</option>
                      <option value="autre">{t("contact_subject_other")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    {t("description")} *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("contact_message_placeholder")}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Send className="h-5 w-5" />
                  {t("contact_send_btn")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{t("contact_agency")}</h2>
          <div className="bg-gray-200 rounded-xl h-96 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <MapPin className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg">
                Gabès, Tunisie
              </p>
              <p className="text-sm mt-2">{t("contact_map_placeholder")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{t("contact_faq_title")}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {faqItems.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
