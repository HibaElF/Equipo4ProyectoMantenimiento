package es.uclm.esibuy.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class CatalogoPermisosTests {

    private static Set<String> nombres(java.util.Collection<? extends GrantedAuthority> autoridades) {
        return autoridades.stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
    }

    private static Set<String> alcanzables(RoleHierarchy jerarquia, String autoridad) {
        return nombres(jerarquia.getReachableGrantedAuthorities(List.of(new SimpleGrantedAuthority(autoridad))));
    }

    @Test
    void cadaRolTieneExactamenteSusPermisos() {
        assertEquals(Set.of(
                "USUARIOS_CONSULTAR", "USUARIOS_MODIFICAR", "USUARIOS_BLOQUEAR", "ADMINISTRADORES_GESTIONAR",
                "PRODUCTOS_CONSULTAR", "AUDITORIA_CONSULTAR", "CATEGORIAS_GESTIONAR", "CATEGORIAS_CONSULTAR"),
                Set.copyOf(CatalogoPermisos.permisosDe("ADMIN")));
        assertEquals(Set.of("PRODUCTOS_GESTIONAR", "PEDIDOS_VENDEDOR_GESTIONAR", "CATEGORIAS_CONSULTAR"),
                Set.copyOf(CatalogoPermisos.permisosDe("VENDEDOR")));
        assertTrue(CatalogoPermisos.permisosDe("CLIENTE").isEmpty());
        assertTrue(CatalogoPermisos.permisosDe("INEXISTENTE").isEmpty());
    }

    @Test
    void elVendedorNoTieneNingunPermisoDeAdministracionYViceversa() {
        Set<String> admin = Set.copyOf(CatalogoPermisos.permisosDe("ADMIN"));
        Set<String> vendedor = Set.copyOf(CatalogoPermisos.permisosDe("VENDEDOR"));

        assertFalse(vendedor.contains("USUARIOS_MODIFICAR"));
        assertFalse(vendedor.contains("CATEGORIAS_GESTIONAR"));
        assertFalse(admin.contains("PRODUCTOS_GESTIONAR"));
        assertFalse(admin.contains("PEDIDOS_VENDEDOR_GESTIONAR"));
        // El único permiso compartido es consultar categorías.
        assertEquals(Set.of("CATEGORIAS_CONSULTAR"),
                admin.stream().filter(vendedor::contains).collect(Collectors.toSet()));
    }

    @Test
    void laJerarquiaExpandeCadaRolASusPermisos() {
        RoleHierarchy jerarquia = CatalogoPermisos.jerarquia();

        Set<String> admin = alcanzables(jerarquia, "ROLE_ADMIN");
        assertTrue(admin.contains("ROLE_ADMIN"));
        assertTrue(admin.containsAll(CatalogoPermisos.permisosDe("ADMIN")));
        assertFalse(admin.contains("PRODUCTOS_GESTIONAR"));

        Set<String> vendedor = alcanzables(jerarquia, "ROLE_VENDEDOR");
        assertTrue(vendedor.contains("ROLE_VENDEDOR"));
        assertTrue(vendedor.containsAll(CatalogoPermisos.permisosDe("VENDEDOR")));
        assertFalse(vendedor.contains("USUARIOS_MODIFICAR"));
        assertFalse(vendedor.contains("ROLE_ADMIN"));

        assertEquals(Set.of("ROLE_CLIENTE"), alcanzables(jerarquia, "ROLE_CLIENTE"));
    }

    @Test
    void unPermisoSueltoNoImplicaNadaMas() {
        assertEquals(Set.of("USUARIOS_CONSULTAR"), alcanzables(CatalogoPermisos.jerarquia(), "USUARIOS_CONSULTAR"));
    }

    @Test
    void laSesionGuardaElRolYSusPermisos() {
        Authentication admin = ContextoAutenticacion.crear("admin@example.com", "ADMIN").getAuthentication();
        Authentication vendedor = ContextoAutenticacion.crear("vendedor@example.com", "VENDEDOR").getAuthentication();
        Authentication cliente = ContextoAutenticacion.crear("cliente@example.com", "CLIENTE").getAuthentication();

        Set<String> autoridadesAdmin = nombres(admin.getAuthorities());
        assertTrue(autoridadesAdmin.contains("ROLE_ADMIN"));
        assertTrue(autoridadesAdmin.containsAll(CatalogoPermisos.permisosDe("ADMIN")));
        assertEquals(1 + CatalogoPermisos.permisosDe("ADMIN").size(), admin.getAuthorities().size());

        Set<String> autoridadesVendedor = nombres(vendedor.getAuthorities());
        assertTrue(autoridadesVendedor.contains("ROLE_VENDEDOR"));
        assertTrue(autoridadesVendedor.containsAll(CatalogoPermisos.permisosDe("VENDEDOR")));
        assertFalse(autoridadesVendedor.contains("USUARIOS_MODIFICAR"));

        assertEquals(Set.of("ROLE_CLIENTE"), nombres(cliente.getAuthorities()));
        assertEquals("admin@example.com", admin.getName());
    }

    @Test
    void elRolSigueSiendoLaPrimeraAutoridadYElFrontendLoEncuentraPorElPrefijo() {
        Authentication admin = ContextoAutenticacion.crear("admin@example.com", "ADMIN").getAuthentication();

        List<String> roles = admin.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith(ContextoAutenticacion.PREFIJO_ROL))
                .toList();

        assertEquals(List.of("ROLE_ADMIN"), roles);
    }
}
