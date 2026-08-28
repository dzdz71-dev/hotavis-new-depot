import { Upload, X, Check, Building2, Image, Home, Users, Package, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

export type PhotoCategory = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  minRecommended: number;
  max: number;
  examples: string[];
  tips: string[];
  order: number;
};

export const PHOTO_CATEGORIES: PhotoCategory[] = [
  {
    id: "logo",
    title: "Logo de votre entreprise",
    subtitle:
      "Ajoutez une version nette et de bonne qualité de votre logo. Il permettra aux clients d'identifier rapidement votre entreprise sur Google.",
    icon: <Image className="h-5 w-5" />,
    minRecommended: 1,
    max: 1,
    examples: ["Logo carré", "Fond transparent", "Haute résolution"],
    tips: ["Format carré conseillé", "Fond transparent recommandé", "Haute résolution"],
    order: 1,
  },
  {
    id: "couverture",
    title: "Photo de couverture",
    subtitle:
      "Choisissez la photo qui représente le mieux votre établissement. Elle sera souvent la première image affichée sur votre fiche Google.",
    icon: <Image className="h-5 w-5" />,
    minRecommended: 1,
    max: 1,
    examples: ["Façade", "Accueil", "Salle principale", "Vitrine", "Réalisation emblématique"],
    tips: ["Photo paysage conseillée", "Bonne luminosité", "Représente votre activité"],
    order: 2,
  },
  {
    id: "exterieures",
    title: "Photos de l'extérieur",
    subtitle:
      "Ajoutez plusieurs photos montrant l'extérieur de votre établissement afin que vos clients puissent le reconnaître facilement.",
    icon: <Building2 className="h-5 w-5" />,
    minRecommended: 3,
    max: 10,
    examples: ["Façade", "Enseigne", "Entrée", "Parking", "Terrasse", "Rue"],
    tips: ["Montrez l'enseigne visible", "Incluez l'entrée principale", "Photos de jour"],
    order: 3,
  },
  {
    id: "interieures",
    title: "Photos de l'intérieur",
    subtitle:
      "Présentez votre intérieur afin de montrer votre environnement de travail et de rassurer vos futurs clients.",
    icon: <Home className="h-5 w-5" />,
    minRecommended: 3,
    max: 10,
    examples: ["Accueil", "Salle", "Bureaux", "Atelier", "Laboratoire", "Comptoir"],
    tips: ["Éclairez bien la pièce", "Montrez l'espace client", "Photos nettes"],
    order: 4,
  },
  {
    id: "equipe",
    title: "Photos de votre équipe",
    subtitle:
      "Montrez les personnes qui accueillent et accompagnent vos clients. Des photos naturelles renforcent la confiance.",
    icon: <Users className="h-5 w-5" />,
    minRecommended: 3,
    max: 10,
    examples: ["Équipe complète", "Collaborateurs", "Artisans", "Employés", "Accueil client"],
    tips: ["Photos naturelles", "Visages souriants", "Tenues professionnelles"],
    order: 5,
  },
  {
    id: "produits",
    title: "Produits ou réalisations",
    subtitle:
      "Ajoutez des photos mettant en valeur vos produits, services ou réalisations afin d'illustrer votre savoir-faire.",
    icon: <Package className="h-5 w-5" />,
    minRecommended: 10,
    max: 20,
    examples: [
      "Boulangerie : pains, viennoiseries, pâtisseries",
      "Restaurant : plats, desserts",
      "Coiffeur : coupes, balayages, avant/après",
      "Garage : réparations, atelier, véhicules",
      "Architecte : réalisations, chantiers",
    ],
    tips: [
      "Photos de qualité",
      "Montrez la diversité de vos réalisations",
      "Incluez des avant/après si pertinent",
    ],
    order: 6,
  },
];

export function getPhotoCategory(id: string): PhotoCategory | undefined {
  return PHOTO_CATEGORIES.find((c) => c.id === id);
}

export function getPhotoState(
  photos: string[],
  minRecommended: number,
): {
  completed: boolean;
  count: number;
  min: number;
  label: string;
  color: string;
} {
  const count = photos.length;
  const completed = count >= minRecommended;
  return {
    completed,
    count,
    min: minRecommended,
    label: completed
      ? "✓ Complété"
      : count === 0
        ? "Photos manquantes"
        : `${count} / ${minRecommended} photos`,
    color: completed ? "text-google-green" : count === 0 ? "text-google-red" : "text-amber-600",
  };
}

export function computePhotoProgress(photos: Record<string, string[]>): {
  percentage: number;
  total: number;
  completed: number;
} {
  let total = 0;
  let completed = 0;
  for (const cat of PHOTO_CATEGORIES) {
    total += cat.minRecommended;
    const count = (photos[cat.id] || []).length;
    completed += Math.min(count, cat.minRecommended);
  }
  return {
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    total,
    completed,
  };
}
