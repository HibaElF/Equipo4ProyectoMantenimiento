package es.uclm.esibuy.backend.controllers;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.security.ContextoAutenticacion;

// T-23: las operaciones de administración y de escritura exigen el rol y el permiso concreto. El controlador
// de prueba reproduce las rutas reales para comprobar las reglas de SecurityConfiguration.
@WebMvcTest(controllers = PermisosFinosAccesoTests.RutasDePrueba.class)
@Import({ SecurityConfiguration.class, PermisosFinosAccesoTests.RutasDePrueba.class })
class PermisosFinosAccesoTests {

    @Autowired
    private MockMvc mockMvc;

    @RestController
    static class RutasDePrueba {
        @GetMapping({ "/administrador/usuarios", "/administrador/usuarios/u1", "/administrador/productos",
                "/administrador/auditoria", "/administrador/ruta-futura", "/categorias", "/categorias/c1",
                "/vendedor/productos", "/vendedor/pedidos/activos", "/vendedor/pedidos/p1" })
        String lectura() {
            return "ok";
        }

        @PutMapping({ "/administrador/usuarios/u1", "/categorias/c1", "/vendedor/productos/p1",
                "/vendedor/pedidos/p1" })
        String modificar() {
            return "ok";
        }

        @PatchMapping({ "/administrador/usuarios/u1/activar", "/administrador/usuarios/u1/bloquear",
                "/administrador/usuarios/u1/desbloquear", "/vendedor/productos/p1/activar",
                "/vendedor/productos/p1/desactivar" })
        String parchear() {
            return "ok";
        }

        @PostMapping({ "/administrador/register", "/categorias", "/vendedor/productos" })
        String crear() {
            return "ok";
        }

        @DeleteMapping({ "/administrador/a1", "/categorias/c1", "/vendedor/productos/p1" })
        String borrar() {
            return "ok";
        }
    }

    private static Arguments ruta(HttpMethod metodo, String url, String rolPermitido) {
        return Arguments.of(metodo, url, rolPermitido);
    }

    static Stream<Arguments> rutas() {
        return Stream.of(
                // Administración de usuarios, administradores, productos y auditoría.
                ruta(HttpMethod.GET, "/administrador/usuarios", "ADMIN"),
                ruta(HttpMethod.GET, "/administrador/usuarios/u1", "ADMIN"),
                ruta(HttpMethod.PUT, "/administrador/usuarios/u1", "ADMIN"),
                ruta(HttpMethod.PATCH, "/administrador/usuarios/u1/activar", "ADMIN"),
                ruta(HttpMethod.PATCH, "/administrador/usuarios/u1/bloquear", "ADMIN"),
                ruta(HttpMethod.PATCH, "/administrador/usuarios/u1/desbloquear", "ADMIN"),
                ruta(HttpMethod.POST, "/administrador/register", "ADMIN"),
                ruta(HttpMethod.DELETE, "/administrador/a1", "ADMIN"),
                ruta(HttpMethod.GET, "/administrador/productos", "ADMIN"),
                ruta(HttpMethod.GET, "/administrador/auditoria", "ADMIN"),
                ruta(HttpMethod.GET, "/administrador/ruta-futura", "ADMIN"),
                // Categorías: escritura solo ADMIN; lectura ADMIN y VENDEDOR.
                ruta(HttpMethod.POST, "/categorias", "ADMIN"),
                ruta(HttpMethod.PUT, "/categorias/c1", "ADMIN"),
                ruta(HttpMethod.DELETE, "/categorias/c1", "ADMIN"),
                // Escritura de productos y pedidos del vendedor.
                ruta(HttpMethod.POST, "/vendedor/productos", "VENDEDOR"),
                ruta(HttpMethod.PUT, "/vendedor/productos/p1", "VENDEDOR"),
                ruta(HttpMethod.PATCH, "/vendedor/productos/p1/activar", "VENDEDOR"),
                ruta(HttpMethod.PATCH, "/vendedor/productos/p1/desactivar", "VENDEDOR"),
                ruta(HttpMethod.DELETE, "/vendedor/productos/p1", "VENDEDOR"),
                ruta(HttpMethod.GET, "/vendedor/pedidos/activos", "VENDEDOR"),
                ruta(HttpMethod.PUT, "/vendedor/pedidos/p1", "VENDEDOR"));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder peticion(
            HttpMethod metodo, String url) {
        return request(metodo, url).with(csrf());
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("rutas")
    void elRolConSusPermisosAccedeYLosDemasRolesRecibenUn403(HttpMethod metodo, String url, String rolPermitido)
            throws Exception {
        mockMvc.perform(peticion(metodo, url).with(user("u@example.com").roles(rolPermitido)))
                .andExpect(status().isOk());

        for (String otro : new String[] { "CLIENTE", "ADMIN", "VENDEDOR" }) {
            if (!otro.equals(rolPermitido)) {
                mockMvc.perform(peticion(metodo, url).with(user("u@example.com").roles(otro)))
                        .andExpect(status().isForbidden());
            }
        }
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("rutas")
    void sinSesionNoSeAccede(HttpMethod metodo, String url, String rolPermitido) throws Exception {
        mockMvc.perform(peticion(metodo, url))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void lasCategoriasSePuedenConsultarComoAdminOVendedorPeroNoComoCliente() throws Exception {
        for (String ruta : new String[] { "/categorias", "/categorias/c1" }) {
            mockMvc.perform(request(HttpMethod.GET, ruta).with(user("u@example.com").roles("ADMIN")))
                    .andExpect(status().isOk());
            mockMvc.perform(request(HttpMethod.GET, ruta).with(user("u@example.com").roles("VENDEDOR")))
                    .andExpect(status().isOk());
            mockMvc.perform(request(HttpMethod.GET, ruta).with(user("u@example.com").roles("CLIENTE")))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void elVendedorConservaLaLecturaDeSusProductosPorRol() throws Exception {
        mockMvc.perform(request(HttpMethod.GET, "/vendedor/productos").with(user("u@example.com").roles("VENDEDOR")))
                .andExpect(status().isOk());
        mockMvc.perform(request(HttpMethod.GET, "/vendedor/productos").with(user("u@example.com").roles("CLIENTE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void unaSesionCreadaPorElLoginConSusPermisosExplicitosTambienAccede() throws Exception {
        var admin = ContextoAutenticacion.crear("admin@example.com", "ADMIN").getAuthentication();
        var vendedor = ContextoAutenticacion.crear("vendedor@example.com", "VENDEDOR").getAuthentication();

        mockMvc.perform(peticion(HttpMethod.PATCH, "/administrador/usuarios/u1/bloquear").with(authentication(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(peticion(HttpMethod.POST, "/vendedor/productos").with(authentication(vendedor)))
                .andExpect(status().isOk());
        mockMvc.perform(peticion(HttpMethod.POST, "/administrador/register").with(authentication(vendedor)))
                .andExpect(status().isForbidden());
    }
}
