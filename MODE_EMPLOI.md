# Mode d'emploi — Gestion Employés

Application de gestion du personnel pour l'Hôtel Ohinéné et Cook Africa : pointage par QR code, demandes (avance, permission, absence, congé exceptionnel) et calcul automatique du salaire. Installable comme une app sur téléphone ou ordinateur (PWA).

Pour l'installation technique (Firebase, déploiement), voir `GUIDE_DEPLOIEMENT.md`.

---

## Installer l'application

Sur le téléphone (Android/iOS) ou l'ordinateur, ouvrez l'URL de l'app dans le navigateur, puis :
- **Android (Chrome)** : menu ⋮ → "Installer l'application" (ou bandeau automatique).
- **iPhone (Safari)** : bouton Partager → "Sur l'écran d'accueil".
- **Ordinateur (Chrome/Edge)** : icône d'installation dans la barre d'adresse.

L'app s'ouvre alors comme une application normale, sans la barre du navigateur.

---

## Côté employé

### Se connecter

Pas de mot de passe à retenir : sur l'écran de connexion employé (`/connexion`), entrez votre **matricule** (un numéro, ex: `1001`) puis votre **code PIN à 4 chiffres** sur le pavé tactile — tout se fait en appuyant sur des chiffres, sans avoir besoin de lire ni écrire. Le matricule et le PIN initial vous sont communiqués par l'administrateur à la création de votre compte (vous pouvez changer votre PIN ensuite dans Profil).

Vous pouvez vous connecter et consulter vos heures/salaire ou soumettre une demande depuis n'importe où (pas besoin d'être au bureau pour ça) — **seul le pointage** exige d'être sur place. Après 5 codes PIN erronés, le compte est bloqué 15 minutes par sécurité.

La connexion administrateur (identifiant + mot de passe classique) se fait sur un écran séparé (`/login`), accessible via le lien "Connexion administrateur".

### Pointer (arrivée / départ)

1. Allez sur l'onglet **Pointer**.
2. Cliquez sur le bouton **Pointer** : la caméra s'ouvre.
3. Scannez le QR code affiché à l'entrée de votre établissement.
4. Autorisez la géolocalisation si demandé.

Le premier scan de la journée enregistre votre **arrivée**, le second votre **départ** (avec calcul automatique des heures travaillées). Le pointage est refusé si :
- vous n'êtes pas connecté au Wi-Fi de l'entreprise,
- vous n'êtes pas physiquement sur le site (contrôle GPS),
- le QR scanné n'est plus valide (régénéré par l'admin).

> **Pourquoi ça parle de "Wi-Fi" mais demande une IP ?** Un téléphone ne peut pas dire à une application le nom du réseau Wi-Fi auquel il est connecté — aucune app web ne peut le lire. Le contrôle se fait donc via l'adresse internet (IP) de la connexion de l'entreprise, qui doit être fixe. Concrètement : si vous êtes bien connecté au Wi-Fi du bureau, ça marche ; sur vos données mobiles ou un autre Wi-Fi, ça sera refusé.

### Mes heures & salaire

Affiche, pour le mois choisi : heures pointées, heures de congés/permissions approuvés (comptées comme travaillées), total par rapport aux heures attendues, et le **salaire net estimé** (avance sur salaire déjà déduite si applicable). C'est une estimation en direct — la fiche officielle n'existe qu'une fois générée par l'admin.

### Mes demandes

Quatre types de demande, à soumettre depuis l'onglet **Mes demandes** :

| Type | Quand l'utiliser | Infos demandées |
|---|---|---|
| **Avance sur salaire** | Besoin d'argent avant la paie | Montant, motif |
| **Permission** | Quelques heures d'absence dans une journée (rdv médical...) | Date, heure de début/fin |
| **Absence** | Un ou plusieurs jours d'absence | Date de début/fin, motif |
| **Congé exceptionnel** | Décès, mariage, accouchement, paternité | Sous-type, date de début/fin |

Toutes les demandes passent par un statut **en attente → approuvée/refusée** par l'admin, visible dans l'historique avec son commentaire éventuel.

- Les **congés exceptionnels et permissions approuvés sont payés intégralement** (comptés comme heures travaillées dans le calcul du salaire).
- Une **absence** approuvée n'est pas spécialement "payée" : elle correspond simplement à des heures non pointées, donc déjà déduites naturellement du salaire (au prorata).
- Une **avance** approuvée n'est déduite du salaire qu'une fois marquée "versée" par l'admin ; elle est ensuite retirée automatiquement du salaire du/des mois suivants jusqu'à remboursement complet.

### Profil

Vos informations (matricule, poste...) et le changement de votre code PIN.

---

## Côté admin (employeur)

### Tableau de bord

Vue d'ensemble de l'établissement sélectionné : nombre d'employés actifs, présents aujourd'hui, demandes en attente (par type), masse salariale estimée du mois en cours.

### Employés

Créer un compte employé (nom, prénom, code PIN initial à 4 chiffres, poste, salaire mensuel, heures attendues par mois, établissement(s)) — le matricule (identifiant de connexion, ex: `1001`) est généré automatiquement, à communiquer à l'employé avec son PIN. Vous pouvez aussi modifier l'employé, réinitialiser son PIN (en cas d'oubli ou de blocage après 5 erreurs), ou le désactiver (ne supprime pas son historique).

### Paramètres pointage — à configurer avant toute utilisation

Pour **chaque établissement**, configurez :

1. **QR code** : cliquez sur "Générer le QR", imprimez l'image et affichez-la à l'entrée. La régénérer invalide l'ancienne (à faire si elle a été perdue ou compromise).
2. **Adresse(s) IP autorisée(s)** : demandez à quelqu'un connecté au vrai Wi-Fi de l'entreprise d'ouvrir cette page et de cliquer "Utiliser mon IP actuelle". Si votre fournisseur internet change l'IP de temps en temps, il faudra la remettre à jour ici (sinon le pointage cessera de fonctionner pour tous).
3. **Position GPS** : depuis le site, cliquez "Utiliser ma position actuelle", puis ajustez le rayon toléré (en mètres) si besoin.

Tant que ces trois éléments ne sont pas configurés, le pointage est refusé à tous les employés de cet établissement (sécurité par défaut).

### Pointages

Historique des pointages par établissement/période/employé, avec correction manuelle possible (oubli de pointage, erreur).

### Demandes

Liste filtrable par statut/type. Approuver ou refuser avec un commentaire optionnel. Pour une **avance approuvée**, un bouton "Marquer comme versée" déclenche la déduction automatique sur les salaires suivants.

### Salaires

1. Sélectionnez la période (mois), cliquez **"Générer les fiches du mois"** : une fiche est créée par employé actif n'en ayant pas déjà pour cette période.
2. Chaque fiche suit le statut **brouillon → validée → payée**.
3. Marquer une fiche "payée" déclenche la déduction effective de l'avance sur salaire (si applicable) sur le solde de l'employé.

#### Comment le salaire est calculé

```
heures totales = heures pointées + heures de congés/permissions approuvés
salaire brut   = salaire mensuel × heures totales / heures attendues par mois
avance déduite = min(solde d'avance dû, salaire brut)
salaire net     = salaire brut − avance déduite
```

**Exemple** : salaire mensuel 150 000, heures attendues 208h, employé a pointé 190h + 8h de congé décès approuvé (198h au total), pas d'avance en cours :
`150 000 × 198 / 208 ≈ 142 788` FCFA.

---

## FAQ / dépannage

**"Le pointage n'est pas encore configuré pour cet établissement"** → l'admin doit générer le QR (Paramètres pointage).

**"Vous devez être connecté au Wi-Fi de l'entreprise pour pointer"** → vérifiez la connexion Wi-Fi ; si le problème persiste alors que vous êtes bien au bureau, l'IP de la connexion a peut-être changé — prévenez l'admin.

**"Vous devez être physiquement sur le site"** → la géolocalisation du téléphone est imprécise en intérieur ou désactivée ; vérifiez que la permission de localisation est accordée au navigateur, ou demandez à l'admin d'augmenter le rayon toléré.

**La caméra ne s'ouvre pas** → vérifiez que le site a la permission caméra dans les réglages du navigateur, et que l'app est ouverte en HTTPS (pas en HTTP simple).

**"QR code invalide ou expiré"** → l'admin a régénéré le QR ; utilisez la nouvelle version affichée à l'entrée.
