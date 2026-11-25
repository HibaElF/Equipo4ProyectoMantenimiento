package es.uclm.esibuy.backend.security;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;

/**
 * Catálogo de permisos finos y su asignación por rol, declarado una sola vez. Lo usan tanto la jerarquía
 * de roles de Spring Security (que expande los permisos de cada rol en la autorización, también en las
 * pruebas con {@code roles("ADMIN")}) como el contexto de la sesión, que guarda el rol y sus permisos.
 * Las operaciones de administración y de escritura exigen el rol <b>y</b> el permiso concreto.
 */
public final class CatalogoPermisos {

    public static final String USUARIOS_CONSULTAR = "USUARIOS_CONSULTAR";
    public static final String USUARIOS_MODIFICAR = "USUARIOS_MODIFICAR";
    public static final String USUARIOS_BLOQUEAR = "USUARIOS_BLOQUEAR";
    public static final String ADMINISTRADORES_GESTIONAR = "ADMINISTRADORES_GESTIONAR";
    public static final String PRODUCTOS_CONSULTAR = "PRODUCTOS_CONSULTAR";
    public static final String AUDITORIA_CONSULTAR = "AUDITORIA_CONSULTAR";
    public static final String CATEGORIAS_GESTIONAR = "CATEGORIAS_GESTIONAR";
    public static final String CATEGORIAS_CONSULTAR = "CATEGORIAS_CONSULTAR";
    public static final String PRODUCTOS_GESTIONAR = "PRODUCTOS_GESTIONAR";
    public static final String PEDIDOS_VENDEDOR_GESTIONAR = "PEDIDOS_VENDEDOR_GESTIONAR";

    // Rol (sin el prefijo ROLE_) -> permisos. El cliente no tiene permisos finos: sus operaciones dependen de
    // que el dato sea suyo, y el propietario sale siempre de la sesión.
    private static final Map<String, List<String>> PERMISOS_POR_ROL = Map.of(
            "ADMIN", List.of(
                    USUARIOS_CONSULTAR,
                    USUARIOS_MODIFICAR,
                    USUARIOS_BLOQUEAR,
                    ADMINISTRADORES_GESTIONAR,
                    PRODUCTOS_CONSULTAR,
                    AUDITORIA_CONSULTAR,
                    CATEGORIAS_GESTIONAR,
                    CATEGORIAS_CONSULTAR),
            "VENDEDOR", List.of(
                    PRODUCTOS_GESTIONAR,
                    PEDIDOS_VENDEDOR_GESTIONAR,
                    CATEGORIAS_CONSULTAR),
            "CLIENTE", List.of());

    private CatalogoPermisos() {
    }

    public static List<String> permisosDe(String rol) {
        return PERMISOS_POR_ROL.getOrDefault(rol, List.of());
    }

    public static Map<String, List<String>> permisosPorRol() {
        return PERMISOS_POR_ROL;
    }

    // ROLE_ADMIN implica sus permisos, etc. Sin prefijo para los permisos: no son roles.
    public static RoleHierarchy jerarquia() {
        RoleHierarchyImpl.Builder constructor = RoleHierarchyImpl.withRolePrefix("");
        for (Map.Entry<String, List<String>> entrada : PERMISOS_POR_ROL.entrySet()) {
            if (!entrada.getValue().isEmpty()) {
                constructor = constructor
                        .role(ContextoAutenticacion.PREFIJO_ROL + entrada.getKey())
                        .implies(entrada.getValue().toArray(String[]::new));
            }
        }
        return constructor.build();
    }
}
