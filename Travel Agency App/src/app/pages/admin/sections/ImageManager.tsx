import React, { useState } from "react";
import { X, Plus, GripVertical, ImageOff, ExternalLink, Sparkles } from "lucide-react";

// ── Galerie Unsplash pré-sélectionnée (images réelles d'hôtels) ───────────
const GALLERY_HOTELS = [
  { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80", label: "Resort piscine" },
  { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop&q=80", label: "Vue mer" },
  { url: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&auto=format&fit=crop&q=80", label: "Chambre deluxe" },
  { url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80", label: "Lobby luxe" },
  { url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80", label: "Piscine extérieure" },
  { url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=80", label: "Façade hôtel" },
  { url: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&auto=format&fit=crop&q=80", label: "Nuit illuminée" },
  { url: "https://images.unsplash.com/photo-1549294413-26f195200c16?w=800&auto=format&fit=crop&q=80", label: "Couloir" },
  { url: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&auto=format&fit=crop&q=80", label: "Chambre double" },
  { url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&auto=format&fit=crop&q=80", label: "Entrée principale" },
  { url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80", label: "Vue panoramique" },
  { url: "https://images.unsplash.com/photo-1614649471128-a0d81012d6aa?w=800&auto=format&fit=crop&q=80", label: "Piscine intérieure" },
  { url: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800&auto=format&fit=crop&q=80", label: "Terrasse" },
  { url: "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800&auto=format&fit=crop&q=80", label: "Bord de mer" },
  { url: "https://images.unsplash.com/photo-1578645510447-e20b4311e3ce?w=800&auto=format&fit=crop&q=80", label: "Plage privée" },
  { url: "https://images.unsplash.com/photo-1543968996-ee822b8176ba?w=800&auto=format&fit=crop&q=80", label: "Restaurant" },
  { url: "https://images.unsplash.com/photo-1562778612-e1e0cda9915c?w=800&auto=format&fit=crop&q=80", label: "Spa & bien-être" },
  { url: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&auto=format&fit=crop&q=80", label: "Suite premium" },
  { url: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&auto=format&fit=crop&q=80", label: "Piscine à débordement" },
  { url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&auto=format&fit=crop&q=80", label: "Hall d'accueil" },
  { url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80", label: "Chambre moderne" },
  { url: "https://images.unsplash.com/photo-1601598851547-4302969d0614?w=800&auto=format&fit=crop&q=80", label: "Suite junior" },
  { url: "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800&auto=format&fit=crop&q=80", label: "Salle de bain" },
  { url: "https://images.unsplash.com/photo-1612152328957-8e09e7ca1e20?w=800&auto=format&fit=crop&q=80", label: "Balcon mer" },
];

const GALLERY_CHAMBRES = [
  { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80", label: "Single confort" },
  { url: "https://images.unsplash.com/photo-1631049421450-348ccd8ee171?w=800&auto=format&fit=crop&q=80", label: "Double standard" },
  { url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&auto=format&fit=crop&q=80", label: "Twin lits" },
  { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80", label: "Suite royale" },
  { url: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&auto=format&fit=crop&q=80", label: "Familiale" },
  { url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop&q=80", label: "Deluxe" },
  { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&auto=format&fit=crop&q=80", label: "Chambre moderne" },
  { url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&auto=format&fit=crop&q=80", label: "Chambre confort" },
  { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop&q=80", label: "Lit king size" },
  { url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80", label: "Chambre vue" },
  { url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80", label: "Suite piscine" },
  { url: "https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800&auto=format&fit=crop&q=80", label: "Chambre luxe" },
  { url: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&auto=format&fit=crop&q=80", label: "Twin cosy" },
  { url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&auto=format&fit=crop&q=80", label: "Familiale spacieuse" },
  { url: "https://images.unsplash.com/photo-1562778612-e1e0cda9915c?w=800&auto=format&fit=crop&q=80", label: "Chambre spa" },
  { url: "https://images.unsplash.com/photo-1560185008-b033106af5c3?w=800&auto=format&fit=crop&q=80", label: "Twin premium" },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface ImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  type?: "hotel" | "chambre";
  maxImages?: number;
}

// ── Component ──────────────────────────────────────────────────────────────
export function ImageManager({ images, onChange, type = "hotel", maxImages = 10 }: ImageManagerProps) {
  const [urlInput,      setUrlInput]      = useState("");
  const [showGallery,   setShowGallery]   = useState(false);
  const [gallerySearch, setGallerySearch] = useState("");
  const [imgErrors,     setImgErrors]     = useState<Record<number, boolean>>({});

  const gallery = type === "chambre" ? GALLERY_CHAMBRES : GALLERY_HOTELS;
  const filteredGallery = gallerySearch
    ? gallery.filter(g => g.label.toLowerCase().includes(gallerySearch.toLowerCase()))
    : gallery;

  const addUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || images.includes(trimmed) || images.length >= maxImages) return;
    onChange([...images, trimmed]);
    setUrlInput("");
  };

  const remove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
    setImgErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...images];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    onChange(arr);
  };

  const moveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    const arr = [...images];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    onChange(arr);
  };

  const pickFromGallery = (url: string) => {
    if (!images.includes(url) && images.length < maxImages) {
      onChange([...images, url]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Thumbnails grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
              {imgErrors[idx] ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-[10px]">URL invalide</span>
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => setImgErrors(prev => ({ ...prev, [idx]: true }))}
                />
              )}

              {/* Primary badge */}
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  Principale
                </span>
              )}

              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1">
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      title="Monter" className="w-5 h-5 bg-white/80 rounded text-gray-700 text-xs flex items-center justify-center hover:bg-white disabled:opacity-30">
                      ↑
                    </button>
                    <button onClick={() => moveDown(idx)} disabled={idx === images.length - 1}
                      title="Descendre" className="w-5 h-5 bg-white/80 rounded text-gray-700 text-xs flex items-center justify-center hover:bg-white disabled:opacity-30">
                      ↓
                    </button>
                  </div>
                  <button onClick={() => remove(idx)}
                    className="w-5 h-5 bg-red-500 rounded text-white flex items-center justify-center hover:bg-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-white text-[10px] justify-center bg-black/40 rounded py-0.5"
                  onClick={e => e.stopPropagation()}>
                  <ExternalLink className="h-3 w-3" /> Voir
                </a>
              </div>
            </div>
          ))}

          {/* Add slot */}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => setShowGallery(true)}
              className="aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px] font-medium">Ajouter</span>
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => setShowGallery(true)}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Cliquez pour ajouter des photos</p>
          <p className="text-xs text-gray-300 mt-1">Jusqu'à {maxImages} images</p>
        </div>
      )}

      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addUrl(urlInput))}
          placeholder="Coller une URL d'image (https://…)"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={images.length >= maxImages}
        />
        <button
          type="button"
          onClick={() => addUrl(urlInput)}
          disabled={!urlInput.trim() || images.length >= maxImages}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
        <button
          type="button"
          onClick={() => setShowGallery(o => !o)}
          className="px-3 py-2 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 text-sm flex items-center gap-1 transition-colors"
          title="Choisir depuis la galerie"
        >
          <Sparkles className="h-4 w-4" />
          Galerie
        </button>
      </div>

      <p className="text-xs text-gray-400">
        {images.length}/{maxImages} image{images.length !== 1 ? "s" : ""} · La première image est l'image principale
      </p>

      {/* Gallery picker modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowGallery(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: "85vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Galerie d'images
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cliquez pour ajouter · {images.length}/{maxImages} sélectionnée{images.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button onClick={() => setShowGallery(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-50">
              <input
                type="text"
                value={gallerySearch}
                onChange={e => setGallerySearch(e.target.value)}
                placeholder="Rechercher : piscine, chambre, suite…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filteredGallery.map(g => {
                  const isSelected = images.includes(g.url);
                  return (
                    <button
                      key={g.url}
                      type="button"
                      onClick={() => isSelected ? remove(images.indexOf(g.url)) : pickFromGallery(g.url)}
                      disabled={!isSelected && images.length >= maxImages}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : images.length >= maxImages
                          ? "border-gray-100 opacity-40 cursor-not-allowed"
                          : "border-transparent hover:border-purple-300"
                      }`}
                    >
                      <div className="aspect-video">
                        <img src={g.url} alt={g.label} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] text-gray-600 px-1.5 py-1 bg-white truncate">{g.label}</p>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500">{images.length} image{images.length !== 1 ? "s" : ""} sélectionnée{images.length !== 1 ? "s" : ""}</span>
              <button
                type="button"
                onClick={() => setShowGallery(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                Valider la sélection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
