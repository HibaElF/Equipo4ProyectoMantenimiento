package es.uclm.esibuy.backend.config;

import java.time.Clock;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import es.uclm.esibuy.backend.security.CatalogoPermisos;
import es.uclm.esibuy.backend.security.ContextoAutenticacion;
import es.uclm.esibuy.backend.security.ContextoLogFilter;
import es.uclm.esibuy.backend.security.FiltroImagenFirmada;
import es.uclm.esibuy.backend.security.LimiteApiFilter;
import es.uclm.esibuy.backend.services.FirmaImagenService;
import es.uclm.esibuy.backend.security.LimiteApiService;
import es.uclm.esibuy.backend.security.LimiteRegistroFilter;
import es.uclm.esibuy.backend.dao.LoginAttemptStore;
import es.uclm.esibuy.backend.security.PepperedBCryptPasswordEncoder;
import es.uclm.esibuy.backend.security.SesionAbsolutaFilter;
import es.uclm.esibuy.backend.security.Seudonimizador;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {

        // Política de contenido: el frontend de Angular se sirve desde el propio backend (mismo origen).
        // style 'unsafe-inline' lo necesita Angular para los estilos de componente; img data: es el QR del
        // TOTP y https: las imágenes de perfil externas; fonts.gstatic.com sirve los ficheros de la tipografía.
        static final String POLITICA_CONTENIDO = "default-src 'self'; "
                        + "script-src 'self'; "
                        + "style-src 'self' 'unsafe-inline'; "
                        + "font-src 'self' https://fonts.gstatic.com; "
                        + "img-src 'self' data: https:; "
                        + "connect-src 'self'; "
                        + "object-src 'none'; "
                        + "base-uri 'self'; "
                        + "form-action 'self'; "
                        + "frame-ancestors 'none'";
        static final String POLITICA_PERMISOS = "camera=(), microphone=(), geolocation=(), payment=()";

        private static final String ROL_ADMIN = "ADMIN";
        private static final String AUT_ADMIN = ContextoAutenticacion.PREFIJO_ROL + ROL_ADMIN;
        private static final String AUT_VENDEDOR = ContextoAutenticacion.PREFIJO_ROL + "VENDEDOR";
        private static final String RUTA_CATEGORIAS = "/categorias/**";

        @Bean
        PasswordEncoder passwordEncoder(
                        @Value("${app.security.password.pepper:}") String pepper) {
                return new PepperedBCryptPasswordEncoder(pepper, 12);
        }

        // Mismo pepper que el codificador de contraseñas: ya es obligatorio para arrancar.
        @Bean
        Seudonimizador seudonimizador(
                        @Value("${app.security.password.pepper:}") String pepper) {
                return new Seudonimizador(pepper);
        }

        // Límite general de la API (en memoria, por instancia). Configurable por propiedades.
        @Bean
        LimiteApiService limiteApiService(
                        @Value("${app.security.rate-limit.api.max-requests:60}") int maximoPeticiones,
                        @Value("${app.security.rate-limit.api.window-seconds:60}") int segundosVentana) {
                return new LimiteApiService(maximoPeticiones, Duration.ofSeconds(segundosVentana), Clock.systemUTC());
        }

        // T-34: firma de las URLs de imágenes. La clave es obligatoria: sin ella la aplicación no arranca.
        @Bean
        FirmaImagenService firmaImagenService(
                        @Value("${app.security.imagenes.firma.key:}") String clave,
                        @Value("${app.security.imagenes.firma.ttl:2h}") Duration vigencia) {
                return new FirmaImagenService(clave, vigencia, Clock.systemUTC());
        }

        // Jerarquía de roles: cada rol implica los permisos de CatalogoPermisos. La usan la autorización HTTP
        // y la de métodos, y hace que los principales con solo ROLE_x (como los de las pruebas) tengan sus permisos.
        @Bean
        RoleHierarchy roleHierarchy() {
                return CatalogoPermisos.jerarquia();
        }

        @Bean
        SecurityContextRepository securityContextRepository() {
                return new HttpSessionSecurityContextRepository();
        }

        @Bean
        CookieCsrfTokenRepository csrfTokenRepository(
                        @Value("${app.security.cookies.secure:true}") boolean cookieSeguro) {

                CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();

                repository.setCookieCustomizer(cookie -> cookie.secure(cookieSeguro).sameSite("Lax"));

                return repository;
        }

        @Bean
        SessionRegistry sessionRegistry() {
                return new SessionRegistryImpl();
        }

        @Bean
        HttpSessionEventPublisher httpSessionEventPublisher() {
                return new HttpSessionEventPublisher();
        }

        @Bean
        SecurityFilterChain securityFilterChain(
                        HttpSecurity http,
                        CorsConfigurationSource corsConfigurationSource,
                        SecurityContextRepository securityContextRepository,
                        CookieCsrfTokenRepository csrfTokenRepository,
                        SessionRegistry sessionRegistry,
                        Seudonimizador seudonimizador,
                        LimiteApiService limiteApiService,
                        FirmaImagenService firmaImagenService,
                        ObjectProvider<LoginAttemptStore> almacenIntentos,
                        @Value("${app.security.rate-limit.registro.max-requests:5}") int maximoAltasPorIp,
                        @Value("${app.security.rate-limit.registro.window-seconds:900}") int ventanaAltasSegundos,
                        @Value("${app.security.csp.report-only:false}") boolean cspSoloInforme,
                        @Value("${app.security.session.absolute-timeout:8h}") Duration timeoutAbsolutoSesion)
                        throws Exception {

                http
                                .addFilterAfter(new ContextoLogFilter(seudonimizador),
                                                SecurityContextHolderFilter.class)

                                .headers(headers -> {
                                        headers.contentSecurityPolicy(csp -> {
                                                csp.policyDirectives(POLITICA_CONTENIDO);
                                                // Modo de solo informe: no bloquea, solo avisa en la consola.
                                                if (cspSoloInforme) {
                                                        csp.reportOnly();
                                                }
                                        });
                                        headers.referrerPolicy(referrer -> referrer.policy(
                                                        ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
                                        headers.permissionsPolicyHeader(
                                                        permisos -> permisos.policy(POLITICA_PERMISOS));
                                })

                                .cors(cors -> cors.configurationSource(corsConfigurationSource))

                                .securityContext(context -> context.securityContextRepository(
                                                securityContextRepository))

                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(
                                                                org.springframework.security.config.http.SessionCreationPolicy.IF_REQUIRED)
                                                .maximumSessions(-1)
                                                .sessionRegistry(sessionRegistry)
                                                .expiredSessionStrategy(event -> event.getResponse()
                                                                .setStatus(HttpStatus.UNAUTHORIZED.value())))

                                .addFilterBefore(new SesionAbsolutaFilter(timeoutAbsolutoSesion),
                                                AuthorizationFilter.class)

                                .addFilterBefore(new FiltroImagenFirmada(firmaImagenService),
                                                AuthorizationFilter.class)

                                .addFilterBefore(new LimiteApiFilter(limiteApiService),
                                                AuthorizationFilter.class)

                                // Después de CsrfFilter y antes de AuthorizationFilter: solo cuentan las altas
                                // con token CSRF válido.
                                .addFilterBefore(new LimiteRegistroFilter(almacenIntentos::getIfAvailable,
                                                maximoAltasPorIp, ventanaAltasSegundos),
                                                AuthorizationFilter.class)

                                .csrf(csrf -> csrf
                                                .csrfTokenRepository(csrfTokenRepository))

                                .logout(logout -> logout
                                                .logoutUrl("/usuarios/logout")
                                                .logoutSuccessHandler(
                                                                (request, response, authentication) -> response
                                                                                .setStatus(204)))

                                // El orden importa: primero las rutas públicas y después las de cada rol.
                                .authorizeHttpRequests(authorize -> {
                                        permitirRutasPublicas(authorize);
                                        restringirPorRol(authorize);
                                });

                return http.build();
        }

        private static void permitirRutasPublicas(
                        AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry authorize) {
                authorize
                                                .requestMatchers(
                                                                HttpMethod.OPTIONS,
                                                                "/**")
                                                .permitAll()

                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/usuarios/login",
                                                                "/usuarios/login/2fa",
                                                                "/usuarios/login/2fa/configurar",
                                                                "/usuarios/login/2fa/confirmar-alta",
                                                                "/usuarios/login/3fa/verificar",
                                                                "/usuarios/login/3fa/reenviar",
                                                                "/usuarios/recuperar-contrasena",
                                                                "/usuarios/recuperar-contrasena/confirmar",
                                                                "/usuarios/verificar-correo",
                                                                "/cliente/register",
                                                                "/vendedor/register")
                                                .permitAll()

                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/usuarios/csrf")
                                                .permitAll()

                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/product-images/**")
                                                .permitAll()
                                                // Recursos públicos del frontend Angular empaquetado
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/",
                                                                "/index.html",
                                                                "/favicon.ico",
                                                                "/*.js",
                                                                "/*.css",
                                                                "/avatars/**",
                                                                "/media/**")
                                                .permitAll()

                                                // Rutas HTML de Angular: solo navegación GET.
                                                // La autorización real de los datos sigue en las API.
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/login",
                                                                "/registro",
                                                                "/recuperar-contrasena",
                                                                "/verificar-correo",
                                                                "/politica-privacidad",
                                                                "/aviso-legal",
                                                                "/perfil",
                                                                "/listas",
                                                                "/perfil/direcciones",
                                                                "/perfil/pagos",
                                                                "/admin",
                                                                "/admin/usuarios",
                                                                "/admin/usuarios/*",
                                                                "/admin/categorias",
                                                                "/admin/administradores",
                                                                "/admin/administradores/nuevo",
                                                                "/admin/productos",
                                                                "/cliente",
                                                                "/cliente/favoritos",
                                                                "/cliente/pedidos",
                                                                "/carrito",
                                                                "/cliente/checkout",
                                                                "/vendedor",
                                                                "/vendedor/pedidos")
                                                .permitAll()

                                                // Necesario para el registro público de vendedores.
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/categorias/registro")
                                                .permitAll();
        }

        private static void restringirPorRol(
                        AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry authorize) {
                authorize
                                                // HU11 + HU17: los vendedores necesitan consultar categorías para
                                                // asociar productos
                                                // Consultar categorías: el permiso lo tienen solo ADMIN y VENDEDOR.
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/categorias",
                                                                RUTA_CATEGORIAS)
                                                .hasAuthority(CatalogoPermisos.CATEGORIAS_CONSULTAR)

                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/categorias")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.CATEGORIAS_GESTIONAR)

                                                .requestMatchers(
                                                                HttpMethod.PUT,
                                                                RUTA_CATEGORIAS)
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.CATEGORIAS_GESTIONAR)

                                                .requestMatchers(
                                                                HttpMethod.DELETE,
                                                                RUTA_CATEGORIAS)
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.CATEGORIAS_GESTIONAR)

                                                .requestMatchers(
                                                                "/cliente/**")
                                                .hasRole("CLIENTE")

                                                // Escritura de productos y gestión de pedidos del vendedor: rol y permiso.
                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/vendedor/productos")
                                                .hasAllAuthorities(AUT_VENDEDOR, CatalogoPermisos.PRODUCTOS_GESTIONAR)

                                                .requestMatchers(
                                                                HttpMethod.PUT,
                                                                "/vendedor/productos/**")
                                                .hasAllAuthorities(AUT_VENDEDOR, CatalogoPermisos.PRODUCTOS_GESTIONAR)

                                                .requestMatchers(
                                                                HttpMethod.PATCH,
                                                                "/vendedor/productos/**")
                                                .hasAllAuthorities(AUT_VENDEDOR, CatalogoPermisos.PRODUCTOS_GESTIONAR)

                                                .requestMatchers(
                                                                HttpMethod.DELETE,
                                                                "/vendedor/productos/**")
                                                .hasAllAuthorities(AUT_VENDEDOR, CatalogoPermisos.PRODUCTOS_GESTIONAR)

                                                .requestMatchers(
                                                                "/vendedor/pedidos/**")
                                                .hasAllAuthorities(AUT_VENDEDOR, CatalogoPermisos.PEDIDOS_VENDEDOR_GESTIONAR)

                                                .requestMatchers(
                                                                "/vendedor/**")
                                                .hasRole("VENDEDOR")

                                                // Administración: rol ADMIN y el permiso concreto de cada operación.
                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/administrador/productos")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.PRODUCTOS_CONSULTAR)

                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/administrador/auditoria")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.AUDITORIA_CONSULTAR)

                                                .requestMatchers(
                                                                HttpMethod.GET,
                                                                "/administrador/usuarios",
                                                                "/administrador/usuarios/*")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.USUARIOS_CONSULTAR)

                                                .requestMatchers(
                                                                HttpMethod.PUT,
                                                                "/administrador/usuarios/*")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.USUARIOS_MODIFICAR)

                                                .requestMatchers(
                                                                HttpMethod.PATCH,
                                                                "/administrador/usuarios/*/activar",
                                                                "/administrador/usuarios/*/bloquear",
                                                                "/administrador/usuarios/*/desbloquear")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.USUARIOS_BLOQUEAR)

                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/administrador/register")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.ADMINISTRADORES_GESTIONAR)

                                                .requestMatchers(
                                                                HttpMethod.DELETE,
                                                                "/administrador/*")
                                                .hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.ADMINISTRADORES_GESTIONAR)

                                                // Cualquier otra ruta de administración (y futuras) exige al menos el rol.
                                                .requestMatchers(
                                                                "/administrador/**")
                                                .hasRole(ROL_ADMIN)

                                                .anyRequest().authenticated();
        }

        @Bean
        CorsConfigurationSource corsConfigurationSource(
                        @Value("${app.cors.allowed-origin:https://localhost:4200}") String allowedOrigin) {

                CorsConfiguration configuration = new CorsConfiguration();

                configuration.setAllowedOrigins(List.of(allowedOrigin));
                configuration.setAllowedMethods(
                                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(
                                List.of("Content-Type", "Accept", "X-XSRF-TOKEN"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration("/**", configuration);

                return source;
        }
}
