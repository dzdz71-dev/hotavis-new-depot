import { motion } from "framer-motion";
import { Stars, GooglePin } from "./GoogleBrand";
import { Phone, Navigation, Globe, MapPin } from "lucide-react";

interface Props {
  variant?: "optimized" | "unoptimized";
  animated?: boolean;
}

export function BusinessCardMockup({ variant = "optimized", animated = false }: Props) {
  const isOpt = variant === "optimized";

  const content = (
    <div className="relative w-full max-w-md mx-auto rounded-2xl bg-white shadow-elevated overflow-hidden border border-border">
      {/* Cover */}
      <div className={`h-32 ${isOpt ? "bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05]" : "bg-muted"} relative`}>
        {!isOpt && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            (aucune photo)
          </div>
        )}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5">
          <GooglePin className="h-3.5 w-3.5" />
          Google
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{isOpt ? "Boulangerie Martin" : "Boulangerie"}</h3>
          {isOpt ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="font-semibold text-sm">4.9</span>
              <Stars />
              <span className="text-sm text-muted-foreground">(127 avis)</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-1">Aucun avis</div>
          )}
          <div className="text-sm text-muted-foreground mt-1">
            {isOpt ? "Boulangerie · 12 rue de la Paix" : "Catégorie incorrecte"}
          </div>
        </div>

        {isOpt && (
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-google-green" />
            <span className="font-medium text-google-green">Ouvert</span>
            <span className="text-muted-foreground">· Ferme à 19h30</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-2">
          <button className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-accent transition">
            <Navigation className="h-4 w-4 text-google-blue" />
            <span className="text-xs font-medium text-google-blue">Itinéraire</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-accent transition">
            <Phone className="h-4 w-4 text-google-green" />
            <span className="text-xs font-medium text-google-green">Appeler</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-accent transition">
            <Globe className="h-4 w-4 text-google-blue" />
            <span className="text-xs font-medium text-google-blue">Site web</span>
          </button>
        </div>

        {isOpt && (
          <div className="grid grid-cols-3 gap-1.5 pt-2">
            {[
              "from-amber-200 to-amber-400",
              "from-rose-200 to-rose-400",
              "from-yellow-200 to-orange-300",
            ].map((g, i) => (
              <div key={i} className={`aspect-square rounded-md bg-gradient-to-br ${g}`} />
            ))}
          </div>
        )}

        {isOpt && (
          <div className="flex items-center gap-1.5 pt-1 text-xs text-google-green font-medium">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-google-green" />
            Répond souvent rapidement
          </div>
        )}
      </div>
    </div>
  );

  if (!animated) return content;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
}
