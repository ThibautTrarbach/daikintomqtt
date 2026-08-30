<div align="center">
    <br>
    <br>
    <h1>Daikin2MQTT  🌉</h1>
    <p>
        Vous permet d'utiliser vos appareils Daikin <b>avec</b> le Cloud Onecta.
    </p>
    <p>
        Daikin2MQTT fait le pont entre le cloud et MQTT afin de contrôler vos appareils Daikin via MQTT et de les intégrer dans votre infrastructure domotique.
    </p>
</div>

## Intégrations
Daikin2MQTT s'intègre avec (presque) toutes les solutions de domotique car il s'appuie sur MQTT. Certaines intégrations sont toutefois spécialement prises en charge (Jeedom, Home Assistant via MQTT Discovery, …).

## Bien démarrer

### Prérequis

- Node.js **20 ou version plus récente** (voir le champ `engines` dans `package.json`)
- Un broker MQTT accessible depuis la machine qui exécute Daikin2MQTT
- Une application Daikin Developer Portal avec un **Client ID**, un **Client Secret** et une **Redirect URL**

### Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/ThibautTrarbach/daikintomqtt.git
   cd daikintomqtt
   ```
2. Installer les dépendances (Yarn ou npm) :
   ```bash
   yarn install
   # ou
   npm install
   ```

### Configuration

Par défaut, Daikin2MQTT attend sa configuration dans le répertoire `config` situé dans le répertoire de travail (ou dans le répertoire pointé par la variable d'environnement `STORE_DIR`).

1. Créer votre fichier de configuration à partir du modèle :
   ```bash
   cp config/settings-default.yml config/settings.yml
   ```
2. Éditer `config/settings.yml` et adapter au minimum les sections suivantes :

- `system`
  - `logLevel` : niveau de log (`error`, `warn`, `info`, `debug`, …)
  - `actionRefreshMode` : mode de rafraîchissement après action (`1` = cloud différé, `2` = optimiste seul, `3` = hybride recommandé)
  - `actionRefreshDelaySeconds` : délai avant GET cloud de confirmation (modes 1 et 3, défaut `60`)
  - `actionRefreshStrategy` : `merge_with_poll` (défaut), `timer` ou `disabled`
  - `mergeWithPollWindowMinutes` : fenêtre pour fusionner le refresh post-action avec le polling (défaut `5`)
  - `commandCoalesceMs` : regroupement des commandes MQTT rapides par équipement (défaut `400`)
  - `energyStatsRefreshTime` : heure du refresh quotidien des compteurs kWh (`HH:MM`, défaut `23:58`)
  - `polling.*` : intervalles jour/nuit (défaut `15` / `30` minutes)
- `integration`
  - `jeedom` : active/désactive l'intégration Jeedom
  - `homeassistant`
    - `enabled` : à `true` pour activer la découverte MQTT pour Home Assistant
    - `discoveryPrefix` : préfixe MQTT Discovery (par défaut `homeassistant`)
- `daikin`
  - `authMode` : `developer_portal` (défaut, 200 req/j) ou `mobile_app` (recommandé, 3000 req/j + WebSocket)
  - **Developer Portal** (`authMode: developer_portal`) :
    - `clientID` et `clientSecret` : fournis par votre application Daikin Developer Portal
    - `clientURL` : URL externe utilisée comme Redirect URL dans le Developer Portal
    - `clientPort` : port local du callback OIDC (défaut `8765`)
  - **Mobile App** (`authMode: mobile_app`) :
    - `email` et `password` : identifiants du compte Onecta (même que l'app mobile)
    - `enableWebSocket` : mises à jour temps réel (défaut `true`)
    - Jetons stockés dans `daikin-mobile-tokenset`
  - `httpTransport` : `node` (défaut) ou `curl` si le TLS Node est bloqué par un WAF
- `mqtt`
  - `host` et `port` : adresse de votre broker MQTT
  - `auth`, `username`, `password` : paramètres d'authentification MQTT si nécessaire
  - `topic` : topic racine sous lequel Daikin2MQTT publie et écoute (par défaut `daikinToMQTT`)

Si le fichier de configuration est invalide au démarrage, Daikin2MQTT s'arrête et affiche des erreurs de validation dans les logs. Une explication détaillée de tous les messages de validation est disponible dans `VALIDATION_ERRORS_DOCUMENTATION.md`.

### Parcours d'autorisation avec Daikin Cloud

#### Mode Developer Portal (OIDC)

Au premier démarrage, si aucun jeton n'est encore stocké :

1. Démarrage du serveur de callback OIDC local (`daikin.clientURL` / `daikin.clientPort`)
2. Événement `authorization_request` avec URL dans les logs
3. Ouvrir l'URL dans le navigateur, accepter le certificat auto-signé, autoriser l'accès
4. Jetons stockés dans `config/daikin-controller-cloud-tokenset`

#### Mode Mobile App (recommandé)

1. Configurer `authMode: mobile_app`, `email` et `password` dans `settings.yml`
2. Au démarrage, authentification automatique via l'API Gigya (comme l'app Onecta)
3. Jetons stockés dans `config/daikin-mobile-tokenset`
4. WebSocket activé par défaut pour les mises à jour temps réel (quota ~3000 req/j)

Les démarrages suivants réutilisent le jeton. Si le jeton devient invalide, Daikin2MQTT le supprime et redemandera une autorisation.

### Exécution

#### Mode développement (TypeScript)

Daikin2MQTT est écrit en TypeScript. En développement, vous pouvez l'exécuter directement depuis les sources :

```bash
yarn run run
# ou
npx ts-node ./src/main.ts
```

#### Mode production

1. Compiler le projet :
   ```bash
   yarn build
   # ou
   npm run build
   ```
2. Démarrer Daikin2MQTT à partir des fichiers JavaScript compilés :
   ```bash
   yarn start
   # ou
   node --preserve-symlinks dist/main.js
   ```

Vous pouvez changer le répertoire de données (configuration, jetons, fichiers générés) en définissant la variable d'environnement `STORE_DIR` avant de lancer le processus.

### MQTT & intégrations

- **MQTT** : Daikin2MQTT publie l'état de vos appareils Daikin et s'abonne aux topics de commandes sous le topic racine défini dans `mqtt.topic` (par défaut `daikinToMQTT`).
- **Home Assistant** : lorsque `integration.homeassistant.enabled` est à `true`, la configuration MQTT Discovery est générée automatiquement et publiée au démarrage.
- **Jeedom** : lorsque `integration.jeedom` est à `true`, le format des messages est adapté à l'intégration Jeedom.

## Quota API Daikin

| Mode | Limite jour | Polling recommandé | WebSocket |
|------|-------------|-------------------|-----------|
| Developer Portal | 200 req/j | 15+ min | Non |
| Mobile App | 3000 req/j | 1–5 min (30+ min si WS actif) | Oui |

| Opération | Coût API |
|-----------|----------|
| Polling / refresh | **1 GET** = tous les équipements |
| Commande | **1 PATCH** par propriété |
| Mise à jour WebSocket | **0 GET** |
| Refresh énergie (`energyStatsRefreshTime`) | **1 GET** prioritaire |

**Optimisations intégrées :**
- Auth **Mobile App** + **WebSocket** (inspiré de [mp-consulting/homebridge-daikin-cloud](https://github.com/mp-consulting/homebridge-daikin-cloud))
- Pause du polling pendant le debounce post-action (évite les GET doubles)
- File d'attente PATCH séquentielle par équipement (400 ms)
- Retry automatique sur erreurs 502/503/504
- Publication **optimiste** MQTT après commande
- Stratégie `merge_with_poll` et skip post-action si WebSocket confirme le changement
- Polling adaptatif selon quota (`API Budget Status` sur le pont système)

Estimation avec les défauts (polling 15 min, ~10 commandes/jour) : ~110 requêtes/jour.

## Appareils supportés

- BRP069A4x
- BRP069A61
- BRP069A62
- BRP069A78
- BRP069B4x
- BRP069C4x
- BRP069C41
- BRP069C8x

Les modèles non listés peuvent être pris en charge automatiquement via **DynamicGateway** (`system.dynamicFallback: true` par défaut) : toutes les caractéristiques settable de l'API Onecta sont exposées en MQTT sans fichier gateway dédié.

## DynamicGateway

- `system.dynamicFallback` : active le mapping automatique pour les modèles inconnus (défaut `true`)
- `system.exposeReadOnly` : publie aussi les capteurs en lecture seule (défaut `true`)
- Nommage MQTT : `_{embeddedId}_{dataPoint}_{chemin}` (ex. `_climateControlMainZone_onOffMode`)
- Commandes spéciales : `_triggerFirmwareUpdate`, `_setPresetAway`, `_{zone}_scheduleEnabled`

Si votre modèle n'est pas listé et que `dynamicFallback` est à `false`, un dump anonymisé est généré dans `config/newConfig/` pour faciliter l'ajout d'un support statique.

## Logs & dépannage

- Les logs sont stockés dans le répertoire `log` (`combined.log`, `error.log`, `debug.log`, …).
- En cas d'échec au démarrage avec des erreurs de validation de configuration, consultez `VALIDATION_ERRORS_DOCUMENTATION.md` pour une description détaillée des erreurs et des exemples de correction.
- Pour les problèmes liés au jeton ou à l'autorisation, reportez-vous aux messages dans les logs ; Daikin2MQTT vous indiquera quand supprimer un jeton invalide et relancer la procédure d'autorisation.

## Développement

Lorsque vous modifiez des fichiers dans le répertoire `src/`, vous devez recompiler Daikin2MQTT pour un usage en production :

```bash
yarn build
# ou
npm run build
```

## Changelog

Consultez [CHANGELOG_FR.md](CHANGELOG_FR.md) pour la liste détaillée des modifications.

## Support & aide
Si vous avez besoin d'aide, vous pouvez consulter les issues ouvertes sur GitHub. N'hésitez pas à proposer des Pull Requests si vous corrigez un problème, ajoutez un nouvel appareil ou si vous voulez simplement partager le projet.


