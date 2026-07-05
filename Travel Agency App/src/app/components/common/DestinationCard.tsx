import { MapPin, Clock, Users } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";

interface DestinationCardProps {
  image: string;
  title: string;
  location: string;
  duration: string;
  people: string;
  price: string;
  description: string;
  onBook?: () => void;
}

export function DestinationCard({
  image,
  title,
  location,
  duration,
  people,
  price,
  description,
  onBook,
}: DestinationCardProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
      <div className="relative h-64 overflow-hidden">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {price}
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <div className="flex items-center gap-1 text-gray-600 text-sm mb-3">
          <MapPin className="h-4 w-4" />
          <span>{location}</span>
        </div>
        <p className="text-gray-600 text-sm mb-4">{description}</p>
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{people}</span>
          </div>
        </div>
        <button
          onClick={onBook}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voir les offres
        </button>
      </div>
    </div>
  );
}
