import { Users, Target, Heart, TrendingUp } from "lucide-react";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";

export function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-4">À Propos de VoyageExpress</h1>
          <p className="text-xl">
            Votre partenaire de confiance pour des voyages exceptionnels depuis 2015
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Notre Histoire</h2>
            <p className="text-gray-700 mb-4">
              Fondée en 2015 par une équipe de passionnés de voyage, VoyageExpress est née d'une
              vision simple : rendre les voyages de qualité accessibles à tous. Ce qui a commencé
              comme une petite agence familiale est devenu l'une des agences de voyage les plus
              respectées en France.
            </p>
            <p className="text-gray-700 mb-4">
              Au fil des années, nous avons aidé plus de 50 000 voyageurs à découvrir le monde,
              créant des souvenirs inoubliables et des expériences authentiques. Notre engagement
              envers l'excellence et la satisfaction client reste au cœur de tout ce que nous
              faisons.
            </p>
            <p className="text-gray-700">
              Aujourd'hui, nous continuons d'innover et d'élargir nos offres pour vous proposer
              les meilleures destinations et les tarifs les plus compétitifs du marché.
            </p>
          </div>
          <div className="relative h-96 rounded-xl overflow-hidden shadow-xl">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1722409195473-d322e99621e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZXNvcnQlMjBwb29sfGVufDF8fHx8MTc3NDI3MzcwNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="About Us"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nos Valeurs</h2>
            <p className="text-xl text-gray-600">
              Ce qui nous guide au quotidien
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Passion</h3>
              <p className="text-gray-600">
                Nous aimons ce que nous faisons et cela se reflète dans chaque voyage que nous
                organisons.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Excellence</h3>
              <p className="text-gray-600">
                Nous visons l'excellence dans chaque aspect de nos services pour votre entière
                satisfaction.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Proximité</h3>
              <p className="text-gray-600">
                Une équipe à l'écoute, disponible et attentive à vos besoins et envies.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Innovation</h3>
              <p className="text-gray-600">
                Nous adoptons les dernières technologies pour améliorer constamment votre
                expérience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-blue-600 rounded-2xl p-12 text-white">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">VoyageExpress en Chiffres</h2>
            <p className="text-xl opacity-90">
              Une croissance qui témoigne de votre confiance
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">50K+</div>
              <div className="text-lg opacity-90">Voyageurs satisfaits</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">150+</div>
              <div className="text-lg opacity-90">Destinations</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">11</div>
              <div className="text-lg opacity-90">Années d'expérience</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">98%</div>
              <div className="text-lg opacity-90">Taux de satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Notre Équipe</h2>
            <p className="text-xl text-gray-600">
              Des experts passionnés à votre service
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sophie Dubois",
                role: "Directrice Générale",
                description: "15 ans d'expérience dans le tourisme de luxe",
              },
              {
                name: "Marc Laurent",
                role: "Responsable Destinations",
                description: "Expert en circuits exotiques et aventure",
              },
              {
                name: "Julie Martin",
                role: "Chef du Service Client",
                description: "Toujours là pour vous accompagner",
              },
            ].map((member, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-2">{member.role}</p>
                <p className="text-gray-600">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
