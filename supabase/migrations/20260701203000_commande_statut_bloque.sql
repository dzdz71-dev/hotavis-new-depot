-- Ajout du statut "bloque" à l'enum commande_statut
-- Permet aux agents de signaler un blocage sur un dossier
ALTER TYPE commande_statut ADD VALUE IF NOT EXISTS 'bloque';