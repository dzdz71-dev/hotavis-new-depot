-- Ajout de la colonne facture_status sur la table commandes
-- Valeurs: non_emise (défaut), emise, payee
alter table commandes
  add column if not exists facture_status text not null default 'non_emise';

-- Contrainte CHECK pour valider les valeurs autorisées
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'commandes_facture_status_check'
  ) then
    alter table commandes
      add constraint commandes_facture_status_check
      check (facture_status in ('non_emise', 'emise', 'payee'));
  end if;
end $$;

-- Index pour filtrer rapidement les factures par statut
create index if not exists idx_commandes_facture_status
  on commandes(facture_status);