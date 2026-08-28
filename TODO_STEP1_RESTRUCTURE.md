# Restructuration Étape 1 Onboarding - Plan d'action

## Analyse de l'existant

- Step 1 actuel : 7 champs (nom_commercial, adresse, code_postal, ville, telephone_affiche, site_web, google_status + email_google)
- Step 2 actuel : categorie_principale, description, type_presence, rayon_intervention_km
- Schéma Zod dans onboarding.functions.ts lignes 38-85
- Traductions dans src/i18n/locales/fr.json lignes 397-483

## Nouvelles spécifications Step 1 (3 sections en cartes)

### Section 1 : Identité de l'entreprise

- nom_commercial \* (existant)
- nom_legal (NOUVEAU - optionnel)
- categorie_principale \* (déplacé de step 2)
- categories_secondaires (NOUVEAU - optionnel, array)

### Section 2 : Présentation de l'entreprise

- description \* (déplacé de step 2, min 100 au lieu de 20, max 750, avec compteur)

### Section 3 : Informations complémentaires

- informations_complementaires (NOUVEAU - textarea libre)

### Champs conservés dans Step 1 (réorganisés)

- adresse, code_postal, ville, telephone_affiche, site_web, google_status, email_google
  → À intégrer dans une section "Coordonnées & Contact" ou Section 1

## Modifications nécessaires

### 1. src/lib/onboarding.functions.ts

- [ ] Ajouter `nom_legal` (optionnel, max 120)
- [ ] Ajouter `categories_secondaires` (array string, optionnel, max 10)
- [ ] Ajouter `informations_complementaires` (string, optionnel, max 2000)
- [ ] Modifier `description` min 100 au lieu de 20
- [ ] Déplacer `categorie_principale` et `description` du step 2 vers step 1 (logique côté client uniquement)

### 2. src/i18n/locales/fr.json

- [ ] Nouvelles clés pour step 1 restructuré
- [ ] Labels, placeholders, hints, sous-textes pour les 3 sections
- [ ] Compteur de caractères pour description

### 3. src/routes/onboarding.$commandeId.tsx

- [ ] Ajouter nouveaux états : nom_legal, categories_secondaires, informations_complementaires
- [ ] Restructurer step === 1 en 3 cartes (sections)
- [ ] Déplacer categorie_principale et description du step 2 vers step 1 (UI uniquement)
- [ ] Ajouter validation description min 100
- [ ] Ajouter compteur caractères pour description
- [ ] Autocomplétion catégories Google (plus tard si nécessaire)
- [ ] Conserver design existant (couleurs, composants, espacements)

### 4. Step 2 ajustement (UI uniquement)

- [ ] Retirer categorie_principale et description du step 2
- [ ] Garder type_presence et rayon_intervention_km

### 5. Tests

- [ ] Vérifier compilation
- [ ] Vérifier affichage step 1
- [ ] Vérifier validation
- [ ] Vérifier soumission complète
