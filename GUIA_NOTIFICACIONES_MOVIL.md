# 📱 GUÍA COMPLETA DE NOTIFICACIONES PUSH - APP MÓVIL

## 🎯 **RESUMEN EJECUTIVO**
Este documento describe la implementación completa del sistema de notificaciones push para la app móvil "Cátedra Familia", incluyendo registro de tokens FCM, manejo de notificaciones, contadores y sincronización.

---

## 🏗️ **ARQUITECTURA DEL SISTEMA**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   APP MÓVIL     │    │    BACKEND      │    │  FIREBASE FCM   │
│                 │    │                 │    │                 │
│ - Registro FCM  │◄──►│ - API REST      │◄──►│ - Push Service  │
│ - Recepción     │    │ - Token Storage │    │ - Delivery      │
│ - Contadores    │    │ - Sync Endpoint │    │ - Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔗 **ENDPOINTS BACKEND DISPONIBLES**

### **Base URL**: `https://escuelaparapadres-backend-1.onrender.com`

### 🔐 **1. Autenticación**
```http
POST /api/movil/auth/login/movil
Content-Type: application/json

{
  "documento": "1234567890",
  "password": "1234567890"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 10,
    "documento": "1234567890",
    "firstName": "Nombre",
    "lastName": "Apellido",
    "roleId": "acudiente"
  },
  "estudiantes": [...]
}
```

### 📲 **2. Registro de Token FCM**
```http
POST /api/movil/notificaciones/token
Authorization: Bearer {token}
Content-Type: application/json

{
  "fcmToken": "c6dTfPH-S12DwUKSeUZnah:APA91b...",
  "dispositivo": "moto e40",
  "sistemaOperativo": "android",
  "versionApp": "1.0.0"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Token FCM registrado exitosamente",
  "data": {
    "tokenRegistrado": true
  }
}
```

### 📋 **3. Listar Notificaciones**
```http
GET /api/movil/notificaciones?page=1&limit=20&leida=false
Authorization: Bearer {token}
```

### ✅ **4. Marcar como Leída**
```http
PUT /api/movil/notificaciones/{id}/leer
Authorization: Bearer {token}
```

### ✅ **5. Marcar Todas como Leídas**
```http
PUT /api/movil/notificaciones/leer-todas
Authorization: Bearer {token}
```

---

## 📱 **IMPLEMENTACIÓN EN FLUTTER/DART**

### **Paso 1: Configuración Firebase**

#### **android/app/build.gradle**
```gradle
dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.1.2'
    implementation 'androidx.work:work-runtime:2.8.1'
}
```

#### **android/app/src/main/AndroidManifest.xml**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />

<service
    android:name=".java.MyFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

### **Paso 2: Servicio de Notificaciones**

#### **lib/services/notification_service.dart**
```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;

class NotificationService {
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();
  
  static const String baseUrl = 'https://escuelaparapadres-backend-1.onrender.com';
  
  // Inicializar servicio
  static Future<void> initialize() async {
    // Permisos
    await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    // Configurar notificaciones locales
    const AndroidInitializationSettings androidSettings = 
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const InitializationSettings initSettings = 
        InitializationSettings(android: androidSettings);
    
    await _localNotifications.initialize(initSettings);
    
    // Handladores
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
  }
  
  // Obtener token FCM
  static Future<String?> getToken() async {
    try {
      return await _firebaseMessaging.getToken();
    } catch (e) {
      print('Error obteniendo FCM token: $e');
      return null;
    }
  }
  
  // Registrar token en backend
  static Future<bool> registerToken(String authToken) async {
    try {
      final fcmToken = await getToken();
      if (fcmToken == null) return false;
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/movil/notificaciones/token'),
        headers: {
          'Authorization': 'Bearer $authToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'fcmToken': fcmToken,
          'dispositivo': await _getDeviceModel(),
          'sistemaOperativo': Platform.isAndroid ? 'android' : 'ios',
          'versionApp': await _getAppVersion(),
        }),
      );
      
      return response.statusCode == 201;
    } catch (e) {
      print('Error registrando token: $e');
      return false;
    }
  }
  
  // Manejar notificación en primer plano
  static void _handleForegroundMessage(RemoteMessage message) {
    print('Notificación recibida en primer plano: ${message.messageId}');
    
    _showLocalNotification(
      message.notification?.title ?? 'Nueva notificación',
      message.notification?.body ?? '',
      message.data,
    );
    
    // Actualizar contador
    NotificationCounter.increment();
  }
  
  // Mostrar notificación local
  static Future<void> _showLocalNotification(
    String title, 
    String body, 
    Map<String, dynamic> data
  ) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'catedra_familia_channel',
      'Cátedra Familia',
      channelDescription: 'Notificaciones de tareas y eventos',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );
    
    const NotificationDetails notificationDetails = 
        NotificationDetails(android: androidDetails);
    
    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      notificationDetails,
      payload: jsonEncode(data),
    );
  }
  
  // Manejar tap en notificación
  static void _handleNotificationTap(RemoteMessage message) {
    print('Usuario tocó notificación: ${message.messageId}');
    
    // Navegar según el tipo
    final tipo = message.data['tipo'];
    final id = message.data['id'];
    
    switch (tipo) {
      case 'tarea':
        NavigationService.navigateToTask(int.parse(id));
        break;
      case 'calificacion':
        NavigationService.navigateToGrades();
        break;
      case 'evento':
        NavigationService.navigateToEvents();
        break;
    }
  }
}
```

### **Paso 3: Contador de Notificaciones**

#### **lib/services/notification_counter.dart**
```dart
import 'package:shared_preferences/shared_preferences.dart';

class NotificationCounter {
  static const String _keyUnreadCount = 'unread_notifications_count';
  static const String _keyLastSync = 'last_notification_sync';
  
  // Obtener contador actual
  static Future<int> getUnreadCount() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_keyUnreadCount) ?? 0;
  }
  
  // Incrementar contador
  static Future<void> increment() async {
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getInt(_keyUnreadCount) ?? 0;
    await prefs.setInt(_keyUnreadCount, current + 1);
    
    // Notificar cambio
    NotificationState.notifyCountChange(current + 1);
  }
  
  // Limpiar contador
  static Future<void> clearCount() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyUnreadCount, 0);
    NotificationState.notifyCountChange(0);
  }
  
  // Sincronizar con backend
  static Future<void> syncWithBackend(String authToken) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/movil/notificaciones?leida=false'),
        headers: {'Authorization': 'Bearer $authToken'},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final unreadCount = data['data']?.length ?? 0;
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt(_keyUnreadCount, unreadCount);
        await prefs.setString(_keyLastSync, DateTime.now().toIso8601String());
        
        NotificationState.notifyCountChange(unreadCount);
      }
    } catch (e) {
      print('Error sincronizando contador: $e');
    }
  }
}
```

### **Paso 4: Estado Global de Notificaciones**

#### **lib/providers/notification_provider.dart**
```dart
import 'package:flutter/foundation.dart';

class NotificationProvider with ChangeNotifier {
  int _unreadCount = 0;
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = false;
  
  // Getters
  int get unreadCount => _unreadCount;
  List<Map<String, dynamic>> get notifications => _notifications;
  bool get isLoading => _isLoading;
  bool get hasUnread => _unreadCount > 0;
  
  // Actualizar contador
  void updateUnreadCount(int count) {
    _unreadCount = count;
    notifyListeners();
  }
  
  // Cargar notificaciones
  Future<void> loadNotifications(String authToken) async {
    _isLoading = true;
    notifyListeners();
    
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/movil/notificaciones?page=1&limit=50'),
        headers: {'Authorization': 'Bearer $authToken'},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _notifications = List<Map<String, dynamic>>.from(data['data'] ?? []);
        
        // Contar no leídas
        _unreadCount = _notifications.where((n) => !n['leida']).length;
      }
    } catch (e) {
      print('Error cargando notificaciones: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  // Marcar como leída
  Future<void> markAsRead(int notificationId, String authToken) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/movil/notificaciones/$notificationId/leer'),
        headers: {'Authorization': 'Bearer $authToken'},
      );
      
      if (response.statusCode == 200) {
        // Actualizar localmente
        final index = _notifications.indexWhere((n) => n['id'] == notificationId);
        if (index != -1) {
          _notifications[index]['leida'] = true;
          _unreadCount = _notifications.where((n) => !n['leida']).length;
          notifyListeners();
        }
      }
    } catch (e) {
      print('Error marcando como leída: $e');
    }
  }
  
  // Marcar todas como leídas
  Future<void> markAllAsRead(String authToken) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/api/movil/notificaciones/leer-todas'),
        headers: {'Authorization': 'Bearer $authToken'},
      );
      
      if (response.statusCode == 200) {
        // Actualizar localmente
        for (var notification in _notifications) {
          notification['leida'] = true;
        }
        _unreadCount = 0;
        notifyListeners();
      }
    } catch (e) {
      print('Error marcando todas como leídas: $e');
    }
  }
}
```

---

## 🎨 **WIDGETS DE UI**

### **Badge de Contador**

#### **lib/widgets/notification_badge.dart**
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class NotificationBadge extends StatelessWidget {
  final Widget child;
  final Color? badgeColor;
  final Color? textColor;
  
  const NotificationBadge({
    Key? key,
    required this.child,
    this.badgeColor,
    this.textColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationProvider>(
      builder: (context, notificationProvider, _) {
        final count = notificationProvider.unreadCount;
        
        return Stack(
          clipBehavior: Clip.none,
          children: [
            child,
            if (count > 0)
              Positioned(
                right: -8,
                top: -8,
                child: Container(
                  padding: EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: badgeColor ?? Colors.red,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  constraints: BoxConstraints(
                    minWidth: 20,
                    minHeight: 20,
                  ),
                  child: Text(
                    count > 99 ? '99+' : count.toString(),
                    style: TextStyle(
                      color: textColor ?? Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
```

### **Lista de Notificaciones**

#### **lib/screens/notifications_screen.dart**
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class NotificationsScreen extends StatefulWidget {
  @override
  _NotificationsScreenState createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadNotifications();
    });
  }
  
  void _loadNotifications() {
    final authToken = AuthService.currentToken;
    if (authToken != null) {
      context.read<NotificationProvider>().loadNotifications(authToken);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Notificaciones'),
        actions: [
          Consumer<NotificationProvider>(
            builder: (context, provider, _) {
              if (provider.hasUnread) {
                return TextButton(
                  onPressed: () => _markAllAsRead(),
                  child: Text('Marcar todas'),
                );
              }
              return SizedBox.shrink();
            },
          ),
        ],
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return Center(child: CircularProgressIndicator());
          }
          
          if (provider.notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No hay notificaciones'),
                ],
              ),
            );
          }
          
          return RefreshIndicator(
            onRefresh: () => provider.loadNotifications(AuthService.currentToken!),
            child: ListView.builder(
              itemCount: provider.notifications.length,
              itemBuilder: (context, index) {
                final notification = provider.notifications[index];
                return NotificationTile(
                  notification: notification,
                  onTap: () => _handleNotificationTap(notification),
                );
              },
            ),
          );
        },
      ),
    );
  }
  
  void _markAllAsRead() {
    final authToken = AuthService.currentToken;
    if (authToken != null) {
      context.read<NotificationProvider>().markAllAsRead(authToken);
    }
  }
  
  void _handleNotificationTap(Map<String, dynamic> notification) {
    // Marcar como leída si no lo está
    if (!notification['leida']) {
      final authToken = AuthService.currentToken;
      if (authToken != null) {
        context.read<NotificationProvider>().markAsRead(
          notification['id'], 
          authToken
        );
      }
    }
    
    // Navegar según el tipo
    final tipo = notification['tipo'];
    final targetId = notification['target_id'];
    
    switch (tipo) {
      case 'tarea':
        Navigator.pushNamed(context, '/task/$targetId');
        break;
      case 'calificacion':
        Navigator.pushNamed(context, '/grades');
        break;
      // Agregar más tipos según necesidad
    }
  }
}
```

---

## 🔄 **FLUJO COMPLETO DE IMPLEMENTACIÓN**

### **1. Al iniciar la app:**
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await NotificationService.initialize();
  
  runApp(MyApp());
}
```

### **2. Después del login exitoso:**
```dart
Future<void> onLoginSuccess(String authToken) async {
  // Registrar token FCM
  final registered = await NotificationService.registerToken(authToken);
  
  if (registered) {
    print('Token FCM registrado correctamente');
  }
  
  // Sincronizar contador
  await NotificationCounter.syncWithBackend(authToken);
  
  // Cargar notificaciones
  if (mounted) {
    context.read<NotificationProvider>().loadNotifications(authToken);
  }
}
```

### **3. En la pantalla principal (AppBar):**
```dart
AppBar(
  actions: [
    NotificationBadge(
      child: IconButton(
        icon: Icon(Icons.notifications),
        onPressed: () => Navigator.pushNamed(context, '/notifications'),
      ),
    ),
  ],
)
```

---

## 🔧 **CONFIGURACIÓN AVANZADA**

### **Tipos de Notificación Soportados:**
- **`tarea`**: Nueva tarea asignada
- **`calificacion`**: Calificación publicada  
- **`evento`**: Evento próximo
- **`recordatorio`**: Recordatorio de tarea

### **Estructura de datos FCM:**
```json
{
  "notification": {
    "title": "Nueva tarea asignada",
    "body": "Matemáticas: Ejercicios de álgebra"
  },
  "data": {
    "tipo": "tarea",
    "target_id": "123",
    "estudiante_id": "456"
  }
}
```

### **Configuración de canales Android:**
```dart
const AndroidNotificationChannel channel = AndroidNotificationChannel(
  'catedra_familia_channel',
  'Cátedra Familia',
  description: 'Notificaciones de tareas y eventos escolares',
  importance: Importance.high,
  playSound: true,
  enableVibration: true,
);
```

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

### **Configuración Base:**
- [ ] Firebase proyecto configurado
- [ ] google-services.json en android/app/
- [ ] Dependencias agregadas en pubspec.yaml
- [ ] Permisos en AndroidManifest.xml
- [ ] Servicio Firebase configurado

### **Código Flutter:**
- [ ] NotificationService implementado
- [ ] NotificationCounter implementado  
- [ ] NotificationProvider implementado
- [ ] NotificationBadge widget creado
- [ ] NotificationsScreen implementada
- [ ] Navegación configurada

### **Integración Backend:**
- [ ] Endpoint de registro probado
- [ ] Endpoint de listado probado
- [ ] Endpoints de marcado probados
- [ ] Token de autenticación persistido
- [ ] Manejo de errores implementado

### **Testing:**
- [ ] Registro de token probado
- [ ] Recepción de notificaciones probada
- [ ] Contador funcionando
- [ ] Navegación desde notificaciones probada
- [ ] Sincronización probada

---

## 🚨 **NOTAS IMPORTANTES**

### **⚠️ Credenciales de Prueba:**
- **Documento**: `1234567890`
- **Password**: `1234567890` 
- **Token FCM de prueba**: `c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI`

### **🔐 Seguridad:**
- El token JWT expira en 7 días
- Implementar refresh automático del token FCM
- Validar siempre las respuestas del backend
- No hardcodear credenciales en producción

### **🔄 Mantenimiento:**
- El token FCM puede cambiar (manejar token refresh)
- Sincronizar contador periódicamente  
- Limpiar notificaciones antiguas
- Monitorear entregas fallidas

---

## 📞 **SOPORTE**

Para dudas sobre implementación o problemas técnicos:
- **Backend URL**: https://escuelaparapadres-backend-1.onrender.com
- **Documento de prueba**: 1234567890
- **Estado del sistema**: ✅ OPERATIVO (Verificado 12/02/2026)

---

*Documento generado automáticamente - Última actualización: 12 de febrero de 2026*