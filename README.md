# Sava Voyages - Agence de Voyage

## Description

Application web de réservation de transport en commun pour une agence desservant les destinations de **Sambava**, **Vohemar**, **Antalaha** et **Andapa**.

## Architecture

```
sava-voyages/
├── backend/
│   ├── server.js              (point d'entrée Express)
│   ├── package.json           (dépendances backend)
│   ├── config/
│   │   └── database.js        (connexion MySQL + SQLite local)
│   ├── routes/
│   │   ├── trajets.js         (API trajets CRUD)
│   │   └── reservations.js    (API réservations CRUD)
│   └── ca.pem                 (certificat SSL Aiven - en production)
├── frontend/
│   ├── index.html             (page d'accueil client)
│   ├── admin.html             (tableau de bord administrateur)
│   ├── login.html             (connexion admin)
│   ├── css/
│   │   └── style.css          (styles globaux)
│   ├── js/
│   │   ├── main.js            (logique client)
│   │   └── admin.js           (logique administration)
│   └── images/                (visuels du site)
└── README.md
```

## Fonctionnalités

### Partie Client
- **Accueil** : Présentation de l'agence, destinations (Sambava, Vohemar, Antalaha, Andapa), trajets disponibles
- **Réservation** : Sélection du trajet, date, nombre de passagers, informations passagers
- **Sélection des sièges** : Interface interactive avec plan du bus, sièges disponibles/occupés
- **Confirmation** : Récapitulatif complet avec numéro de réservation unique
- **Historique** : Suivi des réservations avec statuts (confirmé, annulé, en attente)

### Partie Administration
- **Dashboard** : Statistiques (réservations, revenus, taux d'occupation, passagers)
- **Gestion des trajets** : CRUD complet (création, modification, suppression)
- **Gestion des réservations** : Liste complète avec filtres (date, trajet, statut), modification de statut, annulation

## Installation

### Développement local (SQLite)
```bash
cd backend
npm install
npm start
```
Le serveur démarre sur `http://localhost:4000`

### Production (MySQL)
```bash
cd backend
npm install
export DB_HOST=votre_host
export DB_USER=votre_user
export DB_PASSWORD=votre_password
export DB_NAME=sava_voyages
export DB_SSL=true
npm start
```

## Identifiants Admin par défaut
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

## Trajets par défaut
12 trajets entre les 4 villes (Sambava, Vohemar, Antalaha, Andapa) avec horaires et tarifs préconfigurés.

## Technologies
- **Frontend** : HTML5, CSS3, JavaScript (vanilla)
- **Backend** : Node.js, Express.js
- **Base de données** : MySQL (production) / SQLite (développement)
- **Authentification** : Sessions Express + bcrypt
"# Savavoyage" 
