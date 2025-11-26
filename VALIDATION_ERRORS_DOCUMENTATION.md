# Documentation des Messages d'Erreur de Validation

## 📋 Vue d'ensemble

Ce document liste tous les messages d'erreur possibles lors de la validation de la configuration au démarrage de DaikinToMQTT. Chaque erreur est accompagnée d'une explication, d'exemples et de solutions.

## 🔍 Format des Erreurs

Toutes les erreurs de validation suivent ce format :
```
Erreurs de validation de configuration:
  - <champ>: <message> (valeur: <valeur_actuelle>)
```

## 📂 Erreurs par Section

### 1. Configuration Générale

#### `config: La configuration est vide ou n'existe pas`

**Cause** : Le fichier de configuration est vide, corrompu ou n'existe pas.

**Exemple** :
```yaml
# Fichier vide ou inexistant
```

**Solution** :
- Vérifier que le fichier `config/settings.yml` existe
- Vérifier que le fichier n'est pas vide
- Copier `config/settings-default.yml` vers `config/settings.yml` si nécessaire

---

### 2. Section `system`

#### `system: La section system est requise`

**Cause** : La section `system` est manquante dans le fichier de configuration.

**Exemple** :
```yaml
# ❌ Configuration incorrecte
daikin:
  clientID: "xxx"
mqtt:
  host: "127.0.0.1"
```

**Solution** :
```yaml
# ✅ Configuration correcte
system:
  logLevel: 'info'
  jeedom: false
daikin:
  clientID: "xxx"
mqtt:
  host: "127.0.0.1"
```

---

#### `system.logLevel: Le niveau de log est requis`

**Cause** : Le champ `logLevel` est manquant ou vide.

**Exemple** :
```yaml
system:
  # logLevel manquant
  jeedom: false
```

**Solution** :
```yaml
system:
  logLevel: 'info'  # Ajouter cette ligne
  jeedom: false
```

---

#### `system.logLevel: Le niveau de log doit être l'un des suivants: error, warn, info, debug, verbose`

**Cause** : Le niveau de log spécifié n'est pas valide.

**Exemple** :
```yaml
system:
  logLevel: 'invalid'  # ❌ Valeur invalide
  jeedom: false
```

**Solution** :
```yaml
system:
  logLevel: 'info'  # ✅ Valeur valide parmi: error, warn, info, debug, verbose
  jeedom: false
```

**Valeurs acceptées** :
- `error` : Seulement les erreurs
- `warn` : Avertissements et erreurs
- `info` : Informations, avertissements et erreurs (recommandé)
- `debug` : Tous les logs sauf verbose
- `verbose` : Tous les logs

---

#### `system.jeedom: La valeur doit être un booléen (true/false)`

**Cause** : La valeur n'est pas un booléen.

**Exemple** :
```yaml
system:
  logLevel: 'info'
  jeedom: "true"  # ❌ Chaîne de caractères au lieu de booléen
```

**Solution** :
```yaml
system:
  logLevel: 'info'
  jeedom: true  # ✅ Booléen (sans guillemets)
```

---

### 3. Section `system.polling`

#### `system.polling.dayInterval: L'intervalle de polling en journée est requis`

**Cause** : Le champ `dayInterval` est manquant dans la section `polling`.

**Exemple** :
```yaml
system:
  polling:
    # dayInterval manquant
    nightInterval: 20
```

**Solution** :
```yaml
system:
  polling:
    dayInterval: 10  # Ajouter cette ligne (en minutes)
    nightInterval: 20
```

---

#### `system.polling.dayInterval: L'intervalle de polling en journée doit être un nombre positif (en minutes)`

**Cause** : La valeur n'est pas un nombre ou est négative/nulle.

**Exemple** :
```yaml
system:
  polling:
    dayInterval: "10"  # ❌ Chaîne de caractères
    # ou
    dayInterval: -5     # ❌ Nombre négatif
    # ou
    dayInterval: 0      # ❌ Zéro
```

**Solution** :
```yaml
system:
  polling:
    dayInterval: 10  # ✅ Nombre positif (sans guillemets)
```

---

#### `system.polling.dayInterval: L'intervalle de polling en journée doit être entre 1 et 1440 minutes (24h)`

**Cause** : La valeur est en dehors de la plage autorisée.

**Exemple** :
```yaml
system:
  polling:
    dayInterval: 2000  # ❌ Trop élevé (> 1440)
    # ou
    dayInterval: 0.5   # ❌ Trop faible (< 1)
```

**Solution** :
```yaml
system:
  polling:
    dayInterval: 10  # ✅ Entre 1 et 1440 minutes
```

**Note** : 1440 minutes = 24 heures

---

#### `system.polling.nightInterval: L'intervalle de polling la nuit est requis`

**Cause** : Le champ `nightInterval` est manquant.

**Solution** :
```yaml
system:
  polling:
    dayInterval: 10
    nightInterval: 20  # Ajouter cette ligne
```

---

#### `system.polling.nightInterval: L'intervalle de polling la nuit doit être un nombre positif (en minutes)`

**Cause** : Même problème que `dayInterval` mais pour la nuit.

**Solution** : Utiliser un nombre positif sans guillemets.

---

#### `system.polling.nightInterval: L'intervalle de polling la nuit doit être entre 1 et 1440 minutes (24h)`

**Cause** : Même problème que `dayInterval` mais pour la nuit.

**Solution** : Utiliser une valeur entre 1 et 1440.

---

#### `system.polling.nightStart: L'heure de début de la période nuit est requise`

**Cause** : Le champ `nightStart` est manquant.

**Solution** :
```yaml
system:
  polling:
    dayInterval: 10
    nightInterval: 20
    nightStart: 22  # Ajouter cette ligne (0-23)
    nightEnd: 7
```

---

#### `system.polling.nightStart: L'heure de début de la période nuit doit être un entier`

**Cause** : La valeur n'est pas un entier.

**Exemple** :
```yaml
system:
  polling:
    nightStart: 22.5  # ❌ Nombre décimal
```

**Solution** :
```yaml
system:
  polling:
    nightStart: 22  # ✅ Entier
```

---

#### `system.polling.nightStart: L'heure de début de la période nuit doit être entre 0 et 23`

**Cause** : La valeur est en dehors de la plage 0-23.

**Exemple** :
```yaml
system:
  polling:
    nightStart: 24  # ❌ Trop élevé
    # ou
    nightStart: -1  # ❌ Négatif
```

**Solution** :
```yaml
system:
  polling:
    nightStart: 22  # ✅ Entre 0 et 23
```

---

#### `system.polling.nightEnd: L'heure de fin de la période nuit est requise`

**Cause** : Le champ `nightEnd` est manquant.

**Solution** :
```yaml
system:
  polling:
    nightEnd: 7  # Ajouter cette ligne (0-23)
```

---

#### `system.polling.nightEnd: L'heure de fin de la période nuit doit être un entier`

**Cause** : Même problème que `nightStart`.

**Solution** : Utiliser un entier entre 0 et 23.

---

#### `system.polling.nightEnd: L'heure de fin de la période nuit doit être entre 0 et 23`

**Cause** : Même problème que `nightStart`.

**Solution** : Utiliser une valeur entre 0 et 23.

---

### 4. Section `daikin`

#### `daikin: La section daikin est requise`

**Cause** : La section `daikin` est manquante.

**Solution** :
```yaml
daikin:
  clientID: "votre_client_id"
  clientSecret: "votre_client_secret"
  clientURL: "https://votre-url"
  clientPort: 8765
```

---

#### `daikin.clientID: Le clientID Daikin est requis et ne peut pas être vide`

**Cause** : Le `clientID` est manquant, vide ou contient seulement des espaces.

**Exemple** :
```yaml
daikin:
  clientID: null      # ❌ null
  # ou
  clientID: ""       # ❌ Chaîne vide
  # ou
  clientID: "   "    # ❌ Seulement des espaces
```

**Solution** :
```yaml
daikin:
  clientID: "G7H1LeflCDyx1OnOWjKHMD1O"  # ✅ Votre client ID Daikin
```

**Où obtenir le clientID** :
- Portail développeur Daikin : https://developer.cloud.daikineurope.com/
- Créer une application et récupérer le Client ID

---

#### `daikin.clientSecret: Le clientSecret Daikin est requis et ne peut pas être vide`

**Cause** : Le `clientSecret` est manquant ou vide.

**Exemple** :
```yaml
daikin:
  clientSecret: null  # ❌ null
```

**Solution** :
```yaml
daikin:
  clientSecret: "votre_client_secret"  # ✅ Votre client secret Daikin
```

**Note** : Pour des raisons de sécurité, la valeur réelle n'est pas affichée dans les logs (remplacée par `***`).

---

#### `daikin.clientURL: L'URL du client est requise et ne peut pas être vide`

**Cause** : Le `clientURL` est manquant ou vide.

**Solution** :
```yaml
daikin:
  clientURL: "https://172.16.1.21"  # ✅ URL complète avec protocole
```

---

#### `daikin.clientURL: L'URL doit utiliser le protocole http ou https`

**Cause** : L'URL utilise un protocole non supporté.

**Exemple** :
```yaml
daikin:
  clientURL: "ftp://example.com"  # ❌ Protocole non supporté
```

**Solution** :
```yaml
daikin:
  clientURL: "https://172.16.1.21"  # ✅ http:// ou https://
```

---

#### `daikin.clientURL: L'URL n'est pas valide`

**Cause** : Le format de l'URL est invalide.

**Exemple** :
```yaml
daikin:
  clientURL: "pas une url"  # ❌ Format invalide
```

**Solution** :
```yaml
daikin:
  clientURL: "https://172.16.1.21"  # ✅ URL valide
```

---

#### `daikin.clientPort: Le port du client est requis`

**Cause** : Le `clientPort` est manquant.

**Solution** :
```yaml
daikin:
  clientPort: 8765  # Ajouter cette ligne
```

---

#### `daikin.clientPort: Le port du client doit être un entier`

**Cause** : La valeur n'est pas un entier.

**Exemple** :
```yaml
daikin:
  clientPort: 8765.5  # ❌ Nombre décimal
```

**Solution** :
```yaml
daikin:
  clientPort: 8765  # ✅ Entier
```

---

#### `daikin.clientPort: Le port du client doit être entre 1 et 65535`

**Cause** : La valeur est en dehors de la plage des ports valides.

**Exemple** :
```yaml
daikin:
  clientPort: 0      # ❌ Trop faible
  # ou
  clientPort: 70000  # ❌ Trop élevé
```

**Solution** :
```yaml
daikin:
  clientPort: 8765  # ✅ Entre 1 et 65535
```

---

### 5. Section `mqtt`

#### `mqtt: La section mqtt est requise`

**Cause** : La section `mqtt` est manquante.

**Solution** :
```yaml
mqtt:
  host: "127.0.0.1"
  port: 1883
  auth: false
  connectTimeout: 4000
  reconnectPeriod: 1000
  topic: "Daikin"
```

---

#### `mqtt.host: L'adresse IP ou le nom d'hôte du broker MQTT est requis`

**Cause** : Le `host` est manquant ou vide.

**Solution** :
```yaml
mqtt:
  host: "127.0.0.1"  # ✅ Adresse IP ou hostname
```

---

#### `mqtt.host: Le format de l'adresse IP ou du nom d'hôte n'est pas valide`

**Cause** : Le format n'est pas valide.

**Exemple** :
```yaml
mqtt:
  host: "256.256.256.256"  # ❌ IP invalide
```

**Solution** :
```yaml
mqtt:
  host: "127.0.0.1"        # ✅ IPv4
  # ou
  host: "mqtt.example.com" # ✅ Hostname
  # ou
  host: "localhost"        # ✅ localhost
  # ou
  host: "[2001:0db8::1]"   # ✅ IPv6
```

---

#### `mqtt.port: Le port du broker MQTT est requis`

**Cause** : Le `port` est manquant.

**Solution** :
```yaml
mqtt:
  port: 1883  # Ajouter cette ligne
```

---

#### `mqtt.port: Le port du broker MQTT doit être un entier`

**Cause** : La valeur n'est pas un entier.

**Solution** : Utiliser un entier.

---

#### `mqtt.port: Le port du broker MQTT doit être entre 1 et 65535`

**Cause** : La valeur est en dehors de la plage valide.

**Solution** :
```yaml
mqtt:
  port: 1883  # ✅ Port MQTT standard, ou 8883 pour MQTT over TLS
```

---

#### `mqtt.auth: La valeur auth doit être un booléen (true/false)`

**Cause** : La valeur n'est pas un booléen.

**Exemple** :
```yaml
mqtt:
  auth: "true"  # ❌ Chaîne de caractères
```

**Solution** :
```yaml
mqtt:
  auth: true  # ✅ Booléen
```

---

#### `mqtt.username: Le nom d'utilisateur MQTT est requis lorsque auth est activé`

**Cause** : `auth` est `true` mais `username` est manquant ou vide.

**Exemple** :
```yaml
mqtt:
  auth: true
  username: null  # ❌ Requis si auth = true
```

**Solution** :
```yaml
mqtt:
  auth: true
  username: "mon_utilisateur"  # ✅ Nom d'utilisateur valide
  password: "mon_mot_de_passe"
```

---

#### `mqtt.password: Le mot de passe MQTT est requis lorsque auth est activé`

**Cause** : `auth` est `true` mais `password` est manquant ou vide.

**Solution** :
```yaml
mqtt:
  auth: true
  username: "mon_utilisateur"
  password: "mon_mot_de_passe"  # ✅ Mot de passe valide
```

**Note** : Pour des raisons de sécurité, la valeur réelle n'est pas affichée dans les logs (remplacée par `***`).

---

#### `mqtt.connectTimeout: Le timeout de connexion est requis`

**Cause** : Le `connectTimeout` est manquant.

**Solution** :
```yaml
mqtt:
  connectTimeout: 4000  # Ajouter cette ligne (en millisecondes)
```

---

#### `mqtt.connectTimeout: Le timeout de connexion doit être un nombre positif (en millisecondes)`

**Cause** : La valeur n'est pas un nombre positif.

**Solution** :
```yaml
mqtt:
  connectTimeout: 4000  # ✅ Nombre positif en millisecondes
```

---

#### `mqtt.connectTimeout: Le timeout de connexion doit être entre 1000 et 60000 millisecondes`

**Cause** : La valeur est en dehors de la plage recommandée.

**Exemple** :
```yaml
mqtt:
  connectTimeout: 500    # ❌ Trop faible (< 1000ms)
  # ou
  connectTimeout: 120000 # ❌ Trop élevé (> 60000ms)
```

**Solution** :
```yaml
mqtt:
  connectTimeout: 4000  # ✅ Entre 1000 et 60000 ms (1s à 60s)
```

**Recommandation** : 4000ms (4 secondes) est une valeur raisonnable.

---

#### `mqtt.reconnectPeriod: La période de reconnexion est requise`

**Cause** : Le `reconnectPeriod` est manquant.

**Solution** :
```yaml
mqtt:
  reconnectPeriod: 1000  # Ajouter cette ligne (en millisecondes)
```

---

#### `mqtt.reconnectPeriod: La période de reconnexion doit être un nombre positif ou nul (en millisecondes)`

**Cause** : La valeur est négative.

**Exemple** :
```yaml
mqtt:
  reconnectPeriod: -1000  # ❌ Négatif
```

**Solution** :
```yaml
mqtt:
  reconnectPeriod: 1000  # ✅ Positif ou 0
```

---

#### `mqtt.reconnectPeriod: La période de reconnexion ne devrait pas dépasser 300000 millisecondes (5 minutes)`

**Cause** : La valeur est trop élevée.

**Exemple** :
```yaml
mqtt:
  reconnectPeriod: 600000  # ❌ Trop élevé (> 5 minutes)
```

**Solution** :
```yaml
mqtt:
  reconnectPeriod: 1000  # ✅ Entre 0 et 300000 ms (0 à 5 minutes)
```

**Recommandation** : 1000ms (1 seconde) est une valeur raisonnable.

---

#### `mqtt.topic: Le topic MQTT de base est requis et ne peut pas être vide`

**Cause** : Le `topic` est manquant ou vide.

**Solution** :
```yaml
mqtt:
  topic: "Daikin"  # ✅ Topic de base
```

---

#### `mqtt.topic: Le topic MQTT ne peut pas contenir les caractères #, + ou $`

**Cause** : Le topic contient des caractères wildcards MQTT interdits.

**Exemple** :
```yaml
mqtt:
  topic: "Daikin/#"     # ❌ Contient #
  # ou
  topic: "Daikin/+/set" # ❌ Contient +
  # ou
  topic: "Daikin$"      # ❌ Contient $
```

**Solution** :
```yaml
mqtt:
  topic: "Daikin"           # ✅ Pas de wildcards
  # ou
  topic: "daikin/devices"   # ✅ Caractères alphanumériques et /
```

**Note** : Les wildcards `#` et `+` sont réservés pour les abonnements MQTT, pas pour les topics de base.

---

### 6. Section `homeassistant` (optionnelle)

#### `homeassistant.enabled: La valeur enabled doit être un booléen (true/false)`

**Cause** : La valeur n'est pas un booléen.

**Solution** :
```yaml
homeassistant:
  enabled: true  # ✅ Booléen
```

---

#### `homeassistant.discoveryPrefix: Le préfixe de découverte doit être une chaîne non vide`

**Cause** : Le `discoveryPrefix` est vide ou contient seulement des espaces.

**Exemple** :
```yaml
homeassistant:
  discoveryPrefix: ""  # ❌ Vide
```

**Solution** :
```yaml
homeassistant:
  discoveryPrefix: "homeassistant"  # ✅ Chaîne non vide
```

---

#### `homeassistant.discoveryPrefix: Le préfixe de découverte ne peut contenir que des lettres, chiffres, tirets et underscores`

**Cause** : Le préfixe contient des caractères interdits.

**Exemple** :
```yaml
homeassistant:
  discoveryPrefix: "home-assistant!"  # ❌ Contient !
```

**Solution** :
```yaml
homeassistant:
  discoveryPrefix: "homeassistant"   # ✅ Seulement lettres, chiffres, - et _
  # ou
  discoveryPrefix: "home_assistant"  # ✅ Avec underscore
```

---

## 🔧 Résolution Rapide des Erreurs

### Checklist de Vérification

1. ✅ Toutes les sections requises sont présentes (`system`, `daikin`, `mqtt`)
2. ✅ Tous les champs obligatoires sont remplis
3. ✅ Les types de données sont corrects (booléens sans guillemets, nombres sans guillemets)
4. ✅ Les valeurs sont dans les plages autorisées
5. ✅ Les formats sont valides (URL, IP, topic MQTT, etc.)

### Exemple de Configuration Valide Complète

```yaml
system:
  logLevel: 'info'
  jeedom: false
  polling:
    dayInterval: 10
    nightInterval: 20
    nightStart: 22
    nightEnd: 7

daikin:
  clientID: "votre_client_id"
  clientSecret: "votre_client_secret"
  clientURL: "https://172.16.1.21"
  clientPort: 8765

mqtt:
  host: "127.0.0.1"
  port: 1883
  auth: false
  username: null
  password: null
  connectTimeout: 4000
  reconnectPeriod: 1000
  topic: "Daikin"

homeassistant:
  enabled: false
  discoveryPrefix: "homeassistant"
```

## 📝 Notes Importantes

1. **Sécurité** : Les valeurs sensibles (`clientSecret`, `password`) ne sont jamais affichées dans les logs (remplacées par `***`)

2. **Types de données** :
   - Booléens : `true` ou `false` (sans guillemets)
   - Nombres : `123` (sans guillemets)
   - Chaînes : `"texte"` (avec guillemets)

3. **Valeurs null** : Utiliser `null` (sans guillemets) pour les valeurs optionnelles non définies

4. **Validation au démarrage** : Toutes les erreurs sont détectées et affichées ensemble au démarrage

## 🆘 Obtenir de l'Aide

Si vous rencontrez des erreurs non documentées ici :
1. Vérifier les logs complets au démarrage
2. Vérifier que vous utilisez la dernière version
3. Comparer avec `config/settings-default.yml`
4. Ouvrir une issue sur GitHub avec les logs d'erreur complets

