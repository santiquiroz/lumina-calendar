package com.santiquiroz.lumina;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.CalendarContract;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "DeviceCalendar",
    permissions = { @Permission(strings = { Manifest.permission.READ_CALENDAR }, alias = "calendar") }
)
public class DeviceCalendarPlugin extends Plugin {

    private static final String ALIAS_PERMISO = "calendar";
    private static final String ERROR_PERMISO = "Falta el permiso de calendario";
    private static final String ERROR_RANGO = "Se requieren startMs y endMs";
    private static final String ERROR_CALENDARIOS = "No se pudieron leer los calendarios del sistema";
    private static final String ERROR_EVENTOS = "No se pudieron leer los eventos del sistema";
    private static final String ETIQUETA_POR_DEFECTO = "(sin título)";

    private static final String[] PROYECCION_CALENDARIOS = {
        CalendarContract.Calendars._ID,
        CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
        CalendarContract.Calendars.ACCOUNT_NAME,
        CalendarContract.Calendars.CALENDAR_COLOR
    };
    private static final int COLUMNA_CALENDARIO_ID = 0;
    private static final int COLUMNA_CALENDARIO_NOMBRE = 1;
    private static final int COLUMNA_CALENDARIO_CUENTA = 2;
    private static final int COLUMNA_CALENDARIO_COLOR = 3;

    private static final String[] PROYECCION_INSTANCIAS = {
        CalendarContract.Instances._ID,
        CalendarContract.Instances.CALENDAR_ID,
        CalendarContract.Instances.TITLE,
        CalendarContract.Instances.BEGIN,
        CalendarContract.Instances.END,
        CalendarContract.Instances.ALL_DAY
    };
    private static final int COLUMNA_INSTANCIA_ID = 0;
    private static final int COLUMNA_INSTANCIA_CALENDARIO = 1;
    private static final int COLUMNA_INSTANCIA_TITULO = 2;
    private static final int COLUMNA_INSTANCIA_INICIO = 3;
    private static final int COLUMNA_INSTANCIA_FIN = 4;
    private static final int COLUMNA_INSTANCIA_TODO_EL_DIA = 5;

    @PluginMethod
    public void listCalendars(PluginCall call) {
        if (faltaPermiso()) {
            call.reject(ERROR_PERMISO);
            return;
        }
        try (Cursor cursor = consultarCalendarios()) {
            if (cursor == null) {
                call.reject(ERROR_CALENDARIOS);
                return;
            }
            JSObject respuesta = new JSObject();
            respuesta.put("calendars", recolectarCalendarios(cursor));
            call.resolve(respuesta);
        }
    }

    @PluginMethod
    public void listEvents(PluginCall call) {
        if (faltaPermiso()) {
            call.reject(ERROR_PERMISO);
            return;
        }
        Long inicio = leerMarcaTemporal(call, "startMs");
        Long fin = leerMarcaTemporal(call, "endMs");
        if (inicio == null || fin == null) {
            call.reject(ERROR_RANGO);
            return;
        }
        Set<String> filtro = leerFiltroDeCalendarios(call);
        try (Cursor cursor = consultarInstancias(inicio, fin)) {
            if (cursor == null) {
                call.reject(ERROR_EVENTOS);
                return;
            }
            JSObject respuesta = new JSObject();
            respuesta.put("events", recolectarEventos(cursor, filtro));
            call.resolve(respuesta);
        }
    }

    private boolean faltaPermiso() {
        return getPermissionState(ALIAS_PERMISO) != PermissionState.GRANTED;
    }

    private Cursor consultarCalendarios() {
        ContentResolver resolutor = getContext().getContentResolver();
        return resolutor.query(CalendarContract.Calendars.CONTENT_URI, PROYECCION_CALENDARIOS, null, null, null);
    }

    // Instances.query expande las repeticiones dentro del rango; Events.CONTENT_URI no lo hace.
    private Cursor consultarInstancias(long inicio, long fin) {
        ContentResolver resolutor = getContext().getContentResolver();
        return CalendarContract.Instances.query(resolutor, PROYECCION_INSTANCIAS, inicio, fin);
    }

    private static JSArray recolectarCalendarios(Cursor cursor) {
        JSArray calendarios = new JSArray();
        while (cursor.moveToNext()) {
            calendarios.put(mapearCalendario(cursor));
        }
        return calendarios;
    }

    private static JSArray recolectarEventos(Cursor cursor, Set<String> filtro) {
        JSArray eventos = new JSArray();
        while (cursor.moveToNext()) {
            if (perteneceAlFiltro(filtro, cursor.getString(COLUMNA_INSTANCIA_CALENDARIO))) {
                eventos.put(mapearEvento(cursor));
            }
        }
        return eventos;
    }

    private static JSObject mapearCalendario(Cursor cursor) {
        JSObject calendario = new JSObject();
        calendario.put("id", cursor.getString(COLUMNA_CALENDARIO_ID));
        calendario.put("name", etiquetaVisible(cursor.getString(COLUMNA_CALENDARIO_NOMBRE)));
        calendario.put("account", textoOVacio(cursor.getString(COLUMNA_CALENDARIO_CUENTA)));
        calendario.put("color", cursor.getInt(COLUMNA_CALENDARIO_COLOR));
        return calendario;
    }

    private static JSObject mapearEvento(Cursor cursor) {
        JSObject evento = new JSObject();
        evento.put("id", cursor.getString(COLUMNA_INSTANCIA_ID));
        evento.put("calendarId", cursor.getString(COLUMNA_INSTANCIA_CALENDARIO));
        evento.put("title", etiquetaVisible(cursor.getString(COLUMNA_INSTANCIA_TITULO)));
        evento.put("startMs", cursor.getLong(COLUMNA_INSTANCIA_INICIO));
        evento.put("endMs", cursor.getLong(COLUMNA_INSTANCIA_FIN));
        evento.put("allDay", cursor.getInt(COLUMNA_INSTANCIA_TODO_EL_DIA) == 1);
        return evento;
    }

    private static boolean perteneceAlFiltro(Set<String> filtro, String calendarioId) {
        return filtro == null || filtro.contains(calendarioId);
    }

    private static Set<String> leerFiltroDeCalendarios(PluginCall call) {
        JSArray identificadores = call.getArray("calendarIds");
        if (identificadores == null) {
            return null;
        }
        Set<String> filtro = new HashSet<>();
        for (int indice = 0; indice < identificadores.length(); indice++) {
            filtro.add(identificadores.optString(indice));
        }
        return filtro;
    }

    private static Long leerMarcaTemporal(PluginCall call, String clave) {
        JSObject datos = call.getData();
        if (datos == null || datos.isNull(clave)) {
            return null;
        }
        return datos.optLong(clave);
    }

    private static String etiquetaVisible(String texto) {
        String limpio = textoOVacio(texto);
        return limpio.isEmpty() ? ETIQUETA_POR_DEFECTO : limpio;
    }

    private static String textoOVacio(String texto) {
        return texto == null ? "" : texto.trim();
    }
}
