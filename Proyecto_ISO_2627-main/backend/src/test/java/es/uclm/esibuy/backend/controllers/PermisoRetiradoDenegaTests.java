package es.uclm.esibuy.backend.controllers;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.config.SecurityConfiguration;

// T-23: quitar un permiso a un rol deniega esa operación aunque el principal siga teniendo el rol.
@WebMvcTest(controllers = PermisoRetiradoDenegaTests.RutasDePrueba.class)
@Import({ SecurityConfiguration.class, PermisoRetiradoDenegaTests.RutasDePrueba.class,
        PermisoRetiradoDenegaTests.JerarquiaSinBloquear.class })
class PermisoRetiradoDenegaTests {

    @Autowired
    private MockMvc mockMvc;

    @RestController
    static class RutasDePrueba {
        @GetMapping("/administrador/usuarios")
        String consultar() {
            return "ok";
        }

        @PatchMapping("/administrador/usuarios/u1/bloquear")
        String bloquear() {
            return "ok";
        }
    }

    // El ADMIN conserva el rol y consultar usuarios, pero ya no tiene USUARIOS_BLOQUEAR.
    @TestConfiguration
    static class JerarquiaSinBloquear {
        @Bean
        @Primary
        RoleHierarchy jerarquiaSinPermisoDeBloquear() {
            return RoleHierarchyImpl.withRolePrefix("")
                    .role("ROLE_ADMIN").implies("USUARIOS_CONSULTAR")
                    .build();
        }
    }

    @Test
    void sinElPermisoDeBloquearElAdminRecibeUn403PeroSigueConsultando() throws Exception {
        mockMvc.perform(request(HttpMethod.PATCH, "/administrador/usuarios/u1/bloquear").with(csrf())
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isForbidden());

        mockMvc.perform(request(HttpMethod.GET, "/administrador/usuarios")
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk());
    }
}
