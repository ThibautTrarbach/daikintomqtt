# Changelog

Toutes les modifications notables de Daikin2MQTT seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [2.1.4] - 2026-09-01

### Corrigé

- `auxiliaryUnitPack` : ajout modelInfo, serialNumber (indoor/outdoor) et softwareVersion (outdoor) — couverture complète BRP069C4x

---

## [2.1.3] - 2026-09-01

### Ajouté

- `gatewayDiagnosticsPack` : capteurs réseau/diagnostic gateway (IP, MAC, SSID, support MAJ firmware, état d'erreur)
- `auxiliaryUnitPack` : capteurs unités indoor/outdoor (version logicielle, états erreur/avertissement/précaution) pour BRP069C4x
- Mapping read-only `isPowerfulModeActive` en complément de `powerfulMode` (API firmware 2.6.x)
- Module métadonnées support : génération du rapport de debug, URL issue GitHub, synchronisation des commandes support avec masquage des données sensibles
- Tests unitaires pour l'audit de couverture API et les métadonnées support (`test/unit/apiCoverageAudit.test.js`, `test/unit/supportMetadata.test.ts`)

### Corrigé

- Audit de couverture API : normalisation des chemins datapoint (fix segments `//`), prise en compte metadata `_device`, matching des placeholders `#value#`
- Preset mode Home Assistant : fallback sur `_isPowerfulModeActive` si `_powerfulMode` est absent

### Modifié

- Enrichissement `_device` : `ipAddress`, `macAddress`, et alias `ssid` pour `wifiConnectionSSID`
- Rapport de debug : inclusion du message de support, indication de troncature si les datapoints non mappés dépassent la limite d'affichage (`totalUnmappedCount`)

---

## [2.1.2] - 2026-09-01

### Ajouté

- `authorizationTimeoutSeconds` : délai d'attente configurable pour l'autorisation OAuth navigateur (60–3600 s, validé au démarrage)

### Modifié

- Renommage du package npm : `daikin-deamon` → `daikin2mqtt`

---

## [2.1.1] - 2026-08-31

### Ajouté

- Nettoyage au démarrage des topics MQTT retenus obsolètes (`cleanStaleRetainedTopics`)
- WebSocket : prise en charge des caractéristiques imbriquées et des références dans `applyWebSocketUpdate`
- Module `shutdown.ts` : gestion centralisée de l'arrêt propre (skip poll/publish pendant le shutdown)

### Modifié

- Métadonnées appareil : clés dynamiques dans `AbstractGateway`, enregistrement automatique dans `DynamicGateway`
- `RateLimiter` : fusion des mises à jour partielles, conservation des valeurs précédentes si absentes
- Gestion des erreurs OAuth mobile et transport HTTP affinées
- Point d'entrée `main.ts` (DaikinToMQTT) : meilleure gestion des rejets de promesses non gérés

---

## [2.1.0] - 2026-08-30

### Ajouté

- `authMode: mobile_app` — OAuth Gigya/PKCE (porté depuis [homebridge-daikin-cloud](https://github.com/mp-consulting/homebridge-daikin-cloud)), jetons stockés dans `daikin-mobile-tokenset`
- Complétion automatique de l'inscription Onecta en attente (erreur Gigya 206001) via `completePendingRegistration`
- Client WebSocket Onecta (`src/daikin-cloud/onecta/websocket.ts`) : heartbeat, reconnexion exponentielle, mises à jour temps réel (0 GET)
- `wsUpdateMapper` : WS → cache device → MQTT, skip du refresh post-action si le changement est confirmé par WebSocket
- `DynamicGateway` : fallback automatique pour les modèles d'appareils inconnus (`system.dynamicFallback`, `system.exposeReadOnly`)
- Module `requestBudget` : seuils de quota par mode d'authentification, polling adaptatif (×1.5 bas / ×2 critique)
- Module `actionRefresh` : modes 1/2/3, stratégies `timer` / `merge_with_poll` / `disabled`
- `writeQueue` : file PATCH séquentielle par appareil avec coalescence configurable (`commandCoalesceMs`, défaut 400 ms)
- Publication MQTT optimiste après commande (`publishOptimisticUpdate`) — modes 2 et 3
- `httpTransport: node | curl` avec User-Agent mobile Daikin (contournement WAF/TLS)
- Arrêt propre sur `SIGINT`/`SIGTERM` : arrêt cron, fermeture WebSocket, flush des commandes en attente, vidage cache gateway, déconnexion MQTT
- Capteurs pont système MQTT : `API Budget Status`, `Auth Mode`, `WebSocket Connected`, `Next Polling At`, `Daily Quota Limit`, `Skipped Refresh Count`
- Validation Zod des TokenSet, script `schema:check`, tests d'intégration OAuth (`oauth-developer-portal`, `oauth-mobile-app`)
- Refactoring gateways : `AbstractGateway`, `metadataRegistry`, catalogues de caractéristiques
- `CharacteristicWriter`, `ScheduleManager`, gateways spécialisées (`MonoZoneClimateGateway`, `MultiZoneClimateGateway`, `DualZoneHeatPumpGateway`, `ExtendedMonoZoneClimateGateway`)
- `publishOnDelta` : skip publication MQTT si le payload est inchangé
- Refresh quotidien des stats énergie à heure configurable (`energyStatsRefreshTime`, défaut `23:58`)
- Mode API mock (`useMock` / `mockId`) pour tests sans cloud production
- Node.js ≥ 20 requis

### Modifié

- `RateLimiter` : fusion des en-têtes HTTP rate-limit partiels (compatibilité WebSocket), modes retry refresh/connectivité séparés
- TypeScript strictness renforcée, compilation limitée à `src/` pour la CI
- Point d'entrée restructuré : `src/main.ts` (DaikinToMQTT)
- Intervalles de polling réduits quand le WebSocket est actif (minimum 30 min jour / 60 min nuit en mode `mobile_app`)
- Pause du polling post-action pendant le debounce pour éviter les GET en double

### Corrigé

- Gestion auth : classe `AuthenticationError`, détection centralisée `isAuthFailure`, suppression auto du jeton sur `invalid_grant`
- Retry automatique sur erreurs gateway 502/503/504 et erreurs réseau avec backoff exponentiel et jitter
- Déduplication du refresh token OAuth (`refreshPromise`) dans le flux mobile OAuth

---

## [2.0.4] - 2025

### Modifié

- Amélioration de la gestion des données de consommation énergétique dans `BaseModules`
- Ajustement des intervalles de polling cron pour de meilleures performances

---

## [2.0.3] - 2025

### Modifié

- Synchronisation des numéros de version entre `package.json` et `SystemBridge.ts`

---

## [2.0.2] - 2025

### Modifié

- Amélioration du logging et de l'assignation des propriétés dans `BaseModules`

---

## [2.0.1] - 2025

### Ajouté

- Logging et gestion d'erreurs Daikin renforcés, dont timeout d'autorisation OIDC

### Corrigé

- `updateDaikinDevice` retourne un objet résultat détaillé au lieu d'un booléen
- `dataPointPath` : `null` → `undefined` pour compatibilité API
- `getTimeUntilNextInterval` corrigé pour éviter les polls immédiats ou décalés
- `RateLimiter` : retry sur erreurs de connectivité (`ECONNRESET`, timeout, DNS) avec backoff exponentiel

---

## [2.0.0] - 2025

### Ajouté

- Intégration Daikin Cloud OIDC (authentification Developer Portal)
- Architecture TypeScript avec gateways statiques (BRP069A4x, BRP069A61, BRP069A62, BRP069A78, BRP069B4x, BRP069C4x, BRP069C41, BRP069C8x)
- Intervalles de polling jour/nuit configurables via `node-cron`
- Intégrations MQTT : format messages Jeedom et Home Assistant Discovery
- Modes refresh post-action (1/2/3) et délai de refresh post-action
- Configuration YAML avec validation stricte (`configValidator`)
- Documentation des erreurs de validation (`VALIDATION_ERRORS_DOCUMENTATION_EN.md`, `VALIDATION_ERRORS_DOCUMENTATION_FR.md`)
- Métriques de consommation énergétique et découverte capteurs Home Assistant
- Rate limiting avec suivi quota journalier et persistance cache
- Gestionnaire d'erreurs avec retry sur échecs transitoires
