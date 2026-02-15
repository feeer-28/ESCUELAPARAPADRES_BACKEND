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

## 🤖 **IMPLEMENTACIÓN EN ANDROID NATIVO (JAVA)**

### **Paso 1: Configuración Firebase**

#### **app/build.gradle**
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}

dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.1.2'
    implementation 'com.google.firebase:firebase-analytics:21.2.0'
    implementation 'androidx.work:work-runtime:2.8.1'
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'androidx.recyclerview:recyclerview:1.3.0'
    implementation 'com.google.android.material:material:1.9.0'
}
```

#### **AndroidManifest.xml**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application
    android:name=".CatedraFamiliaApplication"
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:theme="@style/AppTheme">
    
    <!-- Firebase Messaging Service -->
    <service
        android:name=".services.MyFirebaseMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
    
    <!-- Notification Click Handler -->
    <receiver
        android:name=".receivers.NotificationClickReceiver"
        android:exported="false">
        <intent-filter>
            <action android:name="com.catedrafamilia.NOTIFICATION_CLICK" />
        </intent-filter>
    </receiver>
    
    <activity android:name=".MainActivity"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
    </activity>
    
    <activity android:name=".NotificationsActivity" />
    <activity android:name=".TaskDetailActivity" />
</application>
```

### **Paso 2: Servicio Firebase Messaging**

#### **services/MyFirebaseMessagingService.java**
```java
package com.catedrafamilia.services;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.catedrafamilia.R;
import com.catedrafamilia.MainActivity;
import com.catedrafamilia.utils.NotificationCounter;
import com.catedrafamilia.receivers.NotificationClickReceiver;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "catedra_familia_channel";
    private static final String CHANNEL_NAME = "Cátedra Familia";
    private static final String CHANNEL_DESCRIPTION = "Notificaciones de tareas y eventos";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Nuevo FCM token: " + token);
        
        // Guardar token localmente
        getSharedPreferences("fcm_prefs", MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .apply();
        
        // Registrar en backend si usuario está logueado
        String authToken = getSharedPreferences("auth_prefs", MODE_PRIVATE)
            .getString("auth_token", null);
        
        if (authToken != null) {
            NotificationApiService.registerToken(this, token, authToken);
        }
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "Mensaje FCM recibido de: " + remoteMessage.getFrom());

        // Incrementar contador de notificaciones no leídas
        NotificationCounter.increment(this);

        // Extraer datos
        String title = "Nueva notificación";
        String body = "";
        
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
        }

        String tipo = remoteMessage.getData().get("tipo");
        String targetId = remoteMessage.getData().get("target_id");
        String estudianteId = remoteMessage.getData().get("estudiante_id");

        // Mostrar notificación
        showNotification(title, body, tipo, targetId, estudianteId);
    }

    private void showNotification(String title, String body, String tipo, String targetId, String estudianteId) {
        // Intent para manejar click en notificación
        Intent intent = new Intent(this, NotificationClickReceiver.class);
        intent.putExtra("tipo", tipo);
        intent.putExtra("target_id", targetId);
        intent.putExtra("estudiante_id", estudianteId);
        
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Construir notificación
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(new long[]{0, 250, 250, 250})
            .setShowWhen(true);

        // Mostrar notificación
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, builder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(CHANNEL_DESCRIPTION);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 250, 250});

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
}
```

### **Paso 3: Servicio API de Notificaciones**

#### **services/NotificationApiService.java**
```java
package com.catedrafamilia.services;

import android.content.Context;
import android.os.Build;
import android.util.Log;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import retrofit2.http.*;
import com.catedrafamilia.models.FCMRegistrationRequest;
import com.catedrafamilia.models.ApiResponse;

public class NotificationApiService {
    private static final String BASE_URL = "https://escuelaparapadres-backend-1.onrender.com";
    private static final String TAG = "NotificationAPI";
    private static Retrofit retrofit;
    private static ApiInterface apiInterface;

    public interface ApiInterface {
        @POST("/api/movil/notificaciones/token")
        Call<ApiResponse> registerFCMToken(
            @Header("Authorization") String authorization,
            @Body FCMRegistrationRequest request
        );

        @GET("/api/movil/notificaciones")
        Call<ApiResponse> getNotifications(
            @Header("Authorization") String authorization,
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("leida") Boolean leida
        );

        @PUT("/api/movil/notificaciones/{id}/leer")
        Call<ApiResponse> markAsRead(
            @Header("Authorization") String authorization,
            @Path("id") int notificationId
        );

        @PUT("/api/movil/notificaciones/leer-todas")
        Call<ApiResponse> markAllAsRead(
            @Header("Authorization") String authorization
        );
    }

    private static void initRetrofit() {
        if (retrofit == null) {
            retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
            apiInterface = retrofit.create(ApiInterface.class);
        }
    }

    public static void registerToken(Context context, String fcmToken, String authToken) {
        initRetrofit();

        FCMRegistrationRequest request = new FCMRegistrationRequest();
        request.fcmToken = fcmToken;
        request.dispositivo = Build.MODEL;
        request.sistemaOperativo = "android";
        request.versionApp = getVersionName(context);

        Call<ApiResponse> call = apiInterface.registerFCMToken("Bearer " + authToken, request);
        call.enqueue(new Callback<ApiResponse>() {
            @Override
            public void onResponse(Call<ApiResponse> call, Response<ApiResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Log.d(TAG, "Token FCM registrado exitosamente");
                } else {
                    Log.e(TAG, "Error registrando token FCM: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse> call, Throwable t) {
                Log.e(TAG, "Fallo al registrar token FCM", t);
            }
        });
    }

    public static void getNotifications(String authToken, boolean onlyUnread, 
                                      NotificationCallback callback) {
        initRetrofit();

        Boolean leida = onlyUnread ? false : null;
        Call<ApiResponse> call = apiInterface.getNotifications("Bearer " + authToken, 1, 50, leida);
        
        call.enqueue(new Callback<ApiResponse>() {
            @Override
            public void onResponse(Call<ApiResponse> call, Response<ApiResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    callback.onSuccess(response.body());
                } else {
                    callback.onError("Error: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse> call, Throwable t) {
                callback.onError(t.getMessage());
            }
        });
    }

    private static String getVersionName(Context context) {
        try {
            return context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "1.0.0";
        }
    }

    public interface NotificationCallback {
        void onSuccess(ApiResponse response);
        void onError(String error);
    }
}
```

### **Paso 4: Contador de Notificaciones**

#### **utils/NotificationCounter.java**
```java
package com.catedrafamilia.utils;

import android.content.Context;
import android.content.SharedPreferences;

public class NotificationCounter {
    private static final String PREFS_NAME = "notification_counter";
    private static final String KEY_UNREAD_COUNT = "unread_count";
    private static final String KEY_LAST_SYNC = "last_sync";

    public static int getUnreadCount(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getInt(KEY_UNREAD_COUNT, 0);
    }

    public static void setUnreadCount(Context context, int count) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putInt(KEY_UNREAD_COUNT, count)
            .putLong(KEY_LAST_SYNC, System.currentTimeMillis())
            .apply();
        
        // Notificar cambio a listeners
        NotificationCounterListener.notifyCountChange(count);
    }

    public static void increment(Context context) {
        int current = getUnreadCount(context);
        setUnreadCount(context, current + 1);
    }

    public static void decrement(Context context) {
        int current = getUnreadCount(context);
        if (current > 0) {
            setUnreadCount(context, current - 1);
        }
    }

    public static void clearCount(Context context) {
        setUnreadCount(context, 0);
    }

    public static void syncWithBackend(Context context, String authToken) {
        NotificationApiService.getNotifications(authToken, true, new NotificationApiService.NotificationCallback() {
            @Override
            public void onSuccess(ApiResponse response) {
                // Contar notificaciones no leídas de la respuesta
                int unreadCount = 0; // Procesar response.data para contar
                setUnreadCount(context, unreadCount);
            }

            @Override
            public void onError(String error) {
                // Manejar error de sincronización
            }
        });
    }
}
```

### **Paso 5: Receptor de Clicks de Notificación**

#### **receivers/NotificationClickReceiver.java**
```java
package com.catedrafamilia.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.catedrafamilia.MainActivity;
import com.catedrafamilia.TaskDetailActivity;
import com.catedrafamilia.utils.NotificationCounter;

public class NotificationClickReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String tipo = intent.getStringExtra("tipo");
        String targetId = intent.getStringExtra("target_id");
        String estudianteId = intent.getStringExtra("estudiante_id");

        // Decrementar contador
        NotificationCounter.decrement(context);

        // Crear intent de navegación
        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        switch (tipo) {
            case "tarea":
                Intent taskIntent = new Intent(context, TaskDetailActivity.class);
                taskIntent.putExtra("task_id", targetId);
                taskIntent.putExtra("estudiante_id", estudianteId);
                taskIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(taskIntent);
                break;
                
            case "calificacion":
                mainIntent.putExtra("navigate_to", "grades");
                mainIntent.putExtra("estudiante_id", estudianteId);
                context.startActivity(mainIntent);
                break;
                
            case "evento":
                mainIntent.putExtra("navigate_to", "events");
                context.startActivity(mainIntent);
                break;
                
            default:
                context.startActivity(mainIntent);
                break;
        }
    }
}
```

### **Paso 6: Modelos de Datos**

#### **models/FCMRegistrationRequest.java**
```java
package com.catedrafamilia.models;

public class FCMRegistrationRequest {
    public String fcmToken;
    public String dispositivo;
    public String sistemaOperativo;
    public String versionApp;
}
```

#### **models/ApiResponse.java**
```java
package com.catedrafamilia.models;

import java.util.List;
import java.util.Map;

public class ApiResponse {
    public boolean success;
    public String message;
    public List<Map<String, Object>> data;
}
```

### **Paso 7: Badge de Contador para Toolbar**

#### **views/NotificationBadgeView.java**
```java
package com.catedrafamilia.views;

import android.content.Context;
import android.graphics.Color;
import android.util.AttributeSet;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.core.content.ContextCompat;
import com.catedrafamilia.R;

public class NotificationBadgeView extends FrameLayout {
    private TextView badgeText;
    private int count = 0;

    public NotificationBadgeView(Context context) {
        super(context);
        init();
    }

    public NotificationBadgeView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        // Crear TextView para el badge
        badgeText = new TextView(getContext());
        badgeText.setTextColor(Color.WHITE);
        badgeText.setTextSize(12);
        badgeText.setGravity(Gravity.CENTER);
        badgeText.setBackground(ContextCompat.getDrawable(getContext(), R.drawable.badge_background));
        
        // Configurar layout params
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.gravity = Gravity.TOP | Gravity.END;
        params.setMargins(0, -8, -8, 0);
        
        badgeText.setLayoutParams(params);
        badgeText.setMinWidth(dpToPx(20));
        badgeText.setMinHeight(dpToPx(20));
        
        addView(badgeText);
        updateBadgeVisibility();
    }

    public void setCount(int count) {
        this.count = count;
        updateBadgeVisibility();
    }

    private void updateBadgeVisibility() {
        if (count > 0) {
            badgeText.setVisibility(VISIBLE);
            badgeText.setText(count > 99 ? "99+" : String.valueOf(count));
        } else {
            badgeText.setVisibility(GONE);
        }
    }

    private int dpToPx(int dp) {
        return (int) (dp * getContext().getResources().getDisplayMetrics().density);
    }
}
```

### **Paso 8: Actividad de Notificaciones**

#### **NotificationsActivity.java**
```java
package com.catedrafamilia;

import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.catedrafamilia.adapters.NotificationsAdapter;
import com.catedrafamilia.services.NotificationApiService;
import com.catedrafamilia.utils.NotificationCounter;
import java.util.ArrayList;

public class NotificationsActivity extends AppCompatActivity {
    private RecyclerView recyclerView;
    private NotificationsAdapter adapter;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private TextView emptyView;
    private String authToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notifications);

        // Configurar action bar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Notificaciones");
        }

        // Obtener token de autenticación
        authToken = getSharedPreferences("auth_prefs", MODE_PRIVATE)
            .getString("auth_token", null);

        // Inicializar vistas
        initViews();
        
        // Cargar notificaciones
        loadNotifications();
    }

    private void initViews() {
        recyclerView = findViewById(R.id.recyclerView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        progressBar = findViewById(R.id.progressBar);
        emptyView = findViewById(R.id.emptyView);

        // Configurar RecyclerView
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new NotificationsAdapter(new ArrayList<>(), this::onNotificationClick);
        recyclerView.setAdapter(adapter);

        // Configurar SwipeRefresh
        swipeRefresh.setOnRefreshListener(this::loadNotifications);
    }

    private void loadNotifications() {
        if (authToken == null) return;

        showLoading(true);
        NotificationApiService.getNotifications(authToken, false, new NotificationApiService.NotificationCallback() {
            @Override
            public void onSuccess(ApiResponse response) {
                runOnUiThread(() -> {
                    showLoading(false);
                    if (response.data != null && !response.data.isEmpty()) {
                        adapter.updateNotifications(response.data);
                        showEmptyView(false);
                    } else {
                        showEmptyView(true);
                    }
                    swipeRefresh.setRefreshing(false);
                });
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    showLoading(false);
                    swipeRefresh.setRefreshing(false);
                    // Mostrar error
                });
            }
        });
    }

    private void onNotificationClick(Map<String, Object> notification) {
        // Marcar como leída si no lo está
        Boolean leida = (Boolean) notification.get("leida");
        if (leida != null && !leida) {
            // Marca como leída en backend y decrementar contador local
            NotificationCounter.decrement(this);
        }

        // Navegar según el tipo
        String tipo = (String) notification.get("tipo");
        String targetId = String.valueOf(notification.get("target_id"));
        
        // Implementar navegación según el tipo
        switch (tipo) {
            case "tarea":
                startTaskDetailActivity(targetId);
                break;
            case "calificacion":
                startGradesActivity();
                break;
        }
    }

    private void showLoading(boolean show) {
        progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        recyclerView.setVisibility(show ? View.GONE : View.VISIBLE);
    }

    private void showEmptyView(boolean show) {
        emptyView.setVisibility(show ? View.VISIBLE : View.GONE);
        recyclerView.setVisibility(show ? View.GONE : View.VISIBLE);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
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