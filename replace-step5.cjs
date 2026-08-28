const fs = require("fs");

let c = fs.readFileSync("src/routes/onboarding.$commandeId.tsx", "utf8");

const startIdx = c.indexOf("{step === 5 && (");
const endIdx = c.indexOf("{step === 6", startIdx);
const oldSection = c.substring(startIdx, endIdx);

const newSection = `{step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-2">{t("onboarding.s5_title")}</h2>

              {/* Barre de progression globale */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Progression des photos</span>
                  <span className="text-sm font-bold text-google-blue">
                    {(() => {
                      const allPhotos = {
                        logo: logoUrl ? [logoUrl] : [],
                        couverture: couvertureUrl ? [couvertureUrl] : [],
                        exterieures: photosExterieures,
                        interieures: photosInterieures,
                        equipe: photosEquipe,
                        produits: photosMetier,
                      };
                      let total = 1 + 1 + 3 + 3 + 3 + 10;
                      let done = Math.min(allPhotos.logo.length, 1)
                        + Math.min(allPhotos.couverture.length, 1)
                        + Math.min(allPhotos.exterieures.length, 3)
                        + Math.min(allPhotos.interieures.length, 3)
                        + Math.min(allPhotos.equipe.length, 3)
                        + Math.min(allPhotos.produits.length, 10);
                      return Math.round((done / total) * 100) + "%";
                    })()}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-google-blue to-google-green transition-all duration-500"
                    style={{
                      width: \`\${(() => {
                        const allPhotos = {
                          logo: logoUrl ? [logoUrl] : [],
                          couverture: couvertureUrl ? [couvertureUrl] : [],
                          exterieures: photosExterieures,
                          interieures: photosInterieures,
                          equipe: photosEquipe,
                          produits: photosMetier,
                        };
                        let total = 1 + 1 + 3 + 3 + 3 + 10;
                        let done = Math.min(allPhotos.logo.length, 1)
                          + Math.min(allPhotos.couverture.length, 1)
                          + Math.min(allPhotos.exterieures.length, 3)
                          + Math.min(allPhotos.interieures.length, 3)
                          + Math.min(allPhotos.equipe.length, 3)
                          + Math.min(allPhotos.produits.length, 10);
                        return Math.round((done / total) * 100);
                      })()}%\`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {(() => {
                    const total = 1 + 1 + 3 + 3 + 3 + 10;
                    const done = (logoUrl ? 1 : 0) + (couvertureUrl ? 1 : 0)
                      + Math.min(photosExterieures.length, 3)
                      + Math.min(photosInterieures.length, 3)
                      + Math.min(photosEquipe.length, 3)
                      + Math.min(photosMetier.length, 10);
                    return \`\${done} photos ajoutées sur \${total} recommandées\`;
                  })()}
                </p>
              </div>

              {/* Carte Logo */}
              <PhotoCard
                icon={<Image className="h-5 w-5" />}
                title="Logo de votre entreprise"
                subtitle="Ajoutez une version nette et de bonne qualité de votre logo afin de permettre aux clients d'identifier facilement votre entreprise."
                tips={["Format carré conseillé", "Fond transparent recommandé", "Haute résolution"]}
                count={logoUrl ? 1 : 0}
                minRecommended={1}
                max={1}
                uploading={uploading}
                onFile={(file) => handleFile(file, setLogoUrl)}
                photos={logoUrl ? [logoUrl] : []}
                onRemove={() => setLogoUrl("")}
                single
              />

              {/* Carte Photo de couverture */}
              <PhotoCard
                icon={<Image className="h-5 w-5" />}
                title="Photo de couverture"
                subtitle="Choisissez la photo qui représente le mieux votre établissement. Cette photo est généralement la première affichée sur votre fiche Google."
                tips={["Photo paysage conseillée", "Bonne luminosité", "Représente votre activité"]}
                count={couvertureUrl ? 1 : 0}
                minRecommended={1}
                max={1}
                uploading={uploading}
                onFile={(file) => handleFile(file, setCouvertureUrl)}
                photos={couvertureUrl ? [couvertureUrl] : []}
                onRemove={() => setCouvertureUrl("")}
                single
              />

              {/* Carte Photos extérieures */}
              <PhotoCard
                icon={<Building2 className="h-5 w-5" />}
                title="Photos de l'extérieur"
                subtitle="Ajoutez plusieurs photos montrant l'extérieur de votre établissement afin que vos clients puissent le reconnaître facilement."
                examples={["Façade", "Enseigne", "Entrée", "Terrasse", "Parking"]}
                tips={["Montrez l'enseigne visible", "Incluez l'entrée principale", "Photos de jour"]}
                count={photosExterieures.length}
                minRecommended={3}
                max={10}
                uploading={uploading}
                onFiles={async (files) => {
                  for (const file of files)
                    await handleFile(file, (url) => setPhotosExterieures((p) => [...p, url]));
                }}
                photos={photosExterieures}
                onRemove={(i) => setPhotosExterieures(photosExterieures.filter((_, j) => j !== i))}
              />

              {/* Carte Photos intérieures */}
              <PhotoCard
                icon={<Home className="h-5 w-5" />}
                title="Photos de l'intérieur"
                subtitle="Présentez votre établissement afin de mettre en valeur votre environnement et de rassurer vos futurs clients."
                examples={["Accueil", "Salle", "Bureau", "Atelier", "Comptoir"]}
                tips={["Éclairez bien la pièce", "Montrez l'espace client", "Photos nettes"]}
                count={photosInterieures.length}
                minRecommended={3}
                max={10}
                uploading={uploading}
                onFiles={async (files) => {
                  for (const file of files)
                    await handleFile(file, (url) => setPhotosInterieures((p) => [...p, url]));
                }}
                photos={photosInterieures}
                onRemove={(i) => setPhotosInterieures(photosInterieures.filter((_, j) => j !== i))}
              />

              {/* Carte Photos équipe */}
              <PhotoCard
                icon={<Users className="h-5 w-5" />}
                title="Photos de votre équipe"
                subtitle="Présentez les personnes qui accueillent et accompagnent vos clients afin de renforcer la confiance."
                examples={["Équipe", "Collaborateurs", "Personnel", "Artisans"]}
                tips={["Photos naturelles", "Visages souriants", "Tenues professionnelles"]}
                count={photosEquipe.length}
                minRecommended={3}
                max={10}
                uploading={uploading}
                onFiles={async (files) => {
                  for (const file of files)
                    await handleFile(file, (url) => setPhotosEquipe((p) => [...p, url]));
                }}
                photos={photosEquipe}
                onRemove={(i) => setPhotosEquipe(photosEquipe.filter((_, j) => j !== i))}
              />

              {/* Carte Produits ou réalisations */}
              <PhotoCard
                icon={<Package className="h-5 w-5" />}
                title="Produits ou réalisations"
                subtitle="Ajoutez des photos mettant en valeur vos produits, vos services ou vos réalisations afin d'illustrer votre savoir-faire."
                examples={["Produits", "Prestations", "Réalisations", "Avant / Après"]}
                tips={["Photos de qualité", "Diversifiez vos réalisations", "Incluez des avant/après si pertinent"]}
                count={photosMetier.length}
                minRecommended={10}
                max={20}
                uploading={uploading}
                onFiles={async (files) => {
                  for (const file of files)
                    await handleFile(file, (url) => setPhotosMetier((p) => [...p, url]));
                }}
                photos={photosMetier}
                onRemove={(i) => setPhotosMetier(photosMetier.filter((_, j) => j !== i))}
              />
              <Input
                label="Décrivez à quoi correspondent ces photos"
                value={photosMetierDescription}
                onChange={setPhotosMetierDescription}
                placeholder="Ex : Menu de notre restaurant, galerie de nos coiffures, nos plats signature…"
                helper="Cette description aidera nos équipes à comprendre le contexte de vos photos."
              />

              {/* Photos supplémentaires (anciennes) */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Photos supplémentaires (jusqu'à 10)
                </label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Ajoutez toute autre photo utile pour votre fiche Google.
                </p>
                <label className="inline-flex items-center gap-2 rounded-full bg-google-blue text-white px-5 py-2.5 text-sm font-semibold cursor-pointer hover:opacity-90 transition">
                  <Upload className="h-4 w-4" />
                  Sélectionner des fichiers
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading || photosUrls.length >= 10}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []).slice(0, 10 - photosUrls.length);
                      for (const file of files)
                        await handleFile(file, (url) => setPhotosUrls((p) => [...p, url]));
                    }}
                    className="hidden"
                  />
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {photosUrls.map((u, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img src={u} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotosUrls(photosUrls.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {`;

c = c.replace(oldSection, newSection);
fs.writeFileSync("src/routes/onboarding.$commandeId.tsx", c);
console.log("Step 5 replaced successfully");