package es.uclm.esibuy.backend.services;


import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.AdministradorDAO;
import es.uclm.esibuy.backend.dao.CategoriaDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.dto.ListadoUsuariosResponse;
import es.uclm.esibuy.backend.dto.ModificarUsuarioRequest;
import es.uclm.esibuy.backend.dto.RegistroAdministradorRequest;
import es.uclm.esibuy.backend.dto.RegistroUsuarioResponse;
import es.uclm.esibuy.backend.dto.UsuarioAdministracionResponse;
import es.uclm.esibuy.backend.exceptions.AutoBloqueoAdministradorException;
import es.uclm.esibuy.backend.exceptions.AutoEliminacionAdministradorException;
import es.uclm.esibuy.backend.exceptions.DuplicateRegistrationException;
import es.uclm.esibuy.backend.exceptions.InvalidRegistrationException;
import es.uclm.esibuy.backend.exceptions.UltimoAdministradorException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Administrador;
import es.uclm.esibuy.backend.model.Usuario;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import es.uclm.esibuy.backend.validation.ImagenPerfilHttpsValidator;
import es.uclm.esibuy.backend.validation.PatronesEntrada;

@Service
public class AdministradorService {

	private static final String MENSAJE_SOLICITANTE_NO_IDENTIFICADO =
			"No se ha podido identificar al solicitante.";

	private final AdministradorDAO administradorDAO;
	private final CategoriaDAO categoriaDAO;
	private final UsuarioDAO usuarioDAO;
	private final PasswordEncoder passwordEncoder;
	private final PasswordPolicy passwordPolicy;
	private final Validator validator;
	private final SesionService sesionService;
	private final FavoritosRegistroService favoritosRegistroService;
	private final AuditoriaService auditoriaService;

	@Autowired
	public AdministradorService(
			AdministradorDAO administradorDAO,
			CategoriaDAO categoriaDAO,
			UsuarioDAO usuarioDAO,
			PasswordEncoder passwordEncoder,
			PasswordPolicy passwordPolicy,
			Validator validator,
			SesionService sesionService,
			FavoritosRegistroService favoritosRegistroService,
			AuditoriaService auditoriaService) {

		this.administradorDAO = administradorDAO;
		this.categoriaDAO = categoriaDAO;
		this.usuarioDAO = usuarioDAO;
		this.passwordEncoder = passwordEncoder;
		this.passwordPolicy = passwordPolicy;
		this.validator = validator;
		this.sesionService = sesionService;
		this.favoritosRegistroService = favoritosRegistroService;
		this.auditoriaService = auditoriaService;
	}

	public ListadoUsuariosResponse consultarUsuarios(
			String texto,
			String estado,
			String rol,
			Pageable pageable) {

		// Si no se indica rol, filtramos para que NO devuelva administradores
		String rolFiltro = (rol == null || rol.trim().isEmpty())
				? "NO_ADMIN"
				: rol;

		Page<UsuarioAdministracionResponse> pagina =
				usuarioDAO.buscar(texto, estado, rolFiltro, pageable)
						.map(UsuarioAdministracionResponse::desde);

		return new ListadoUsuariosResponse(
				pagina.getContent(),
				pagina.getNumber(),
				pagina.getSize(),
				pagina.getTotalElements(),
				pagina.getTotalPages(),
				usuarioDAO.obtenerEstadisticas());
	}

	public UsuarioAdministracionResponse consultarUsuario(String id) {

		return usuarioDAO.buscarPorId(id)
				.map(UsuarioAdministracionResponse::desde)
				.orElseThrow(() ->
						new UsuarioNoEncontradoException(id));
	}

	/*
	 * HU07 - Modificar usuario
	 */
	public UsuarioAdministracionResponse modificarUsuario(
			String id,
			ModificarUsuarioRequest request) {

		if (request == null) {
			throw new DatosNoValidosException(
					"Los datos de modificación son obligatorios.");
		}

		Usuario usuario = usuarioDAO.findById(id)
				.orElseThrow(() ->
						new UsuarioNoEncontradoException(id));

		/*
		 * Campos comunes modificables
		 */
		if (request.nombre() == null ||
				request.nombre().isBlank()) {

			throw new DatosNoValidosException(
					"El nombre es obligatorio.");
		}

		if (request.apellidos() == null ||
				request.apellidos().isBlank()) {

			throw new DatosNoValidosException(
					"Los apellidos son obligatorios.");
		}

		validarTelefono(request.telefono());
		validarImagenPerfil(request.imagenPerfil());

		usuario.setNombre(
				request.nombre().trim());

		usuario.setApellidos(
				request.apellidos().trim());

		if (request.telefono() != null) {
			usuario.setTelefono(request.telefono().isBlank() ? null : request.telefono());
		}

		usuario.setImagenPerfil(
				request.imagenPerfil() == null
						? null
						: request.imagenPerfil().trim());

		/*
		 * Campos específicos según
		 * el tipo de usuario
		 */
		DatosRolUsuario.modificar(usuario, request, categoriaDAO);

		/*
		 * Persistimos los cambios
		 */
		Usuario usuarioGuardado =
				usuarioDAO.save(usuario);

		auditoriaService.registrarUsuarioModificado(usuarioGuardado.getId());

		return UsuarioAdministracionResponse.desde(
				usuarioGuardado);
	}

	private void validarTelefono(String telefono) {
		if (telefono != null && !telefono.isBlank()
				&& !telefono.matches(PatronesEntrada.TELEFONO)) {
			throw new DatosNoValidosException("Introduce un teléfono válido o deja el campo vacío.");
		}
	}

	private void validarImagenPerfil(String imagenPerfil) {
		if (imagenPerfil == null || imagenPerfil.isBlank()) {
			return;
		}

		String url = imagenPerfil.trim();
		if (url.length() > 1000) {
			throw new DatosNoValidosException("La URL de la imagen de perfil no puede superar 1000 caracteres.");
		}

		// Misma comprobación que el alta (@ImagenPerfilHttps): una sola fuente de verdad.
		if (!ImagenPerfilHttpsValidator.esUrlHttpsValida(url)) {
			throw new DatosNoValidosException(
					"La imagen de perfil debe utilizar una URL HTTPS válida.");
		}
	}

	public RegistroUsuarioResponse registrar(
			RegistroAdministradorRequest request) {

		if (request == null) {
			throw new InvalidRegistrationException();
		}

		// Errores por campo, con el mismo formato que el alta de cliente y de vendedor.
		Map<String, List<String>> errores = new LinkedHashMap<>();
		for (ConstraintViolation<RegistroAdministradorRequest> incumplimiento : validator.validate(request)) {
			errores.computeIfAbsent(incumplimiento.getPropertyPath().toString(), campo -> new ArrayList<>())
					.add(incumplimiento.getMessage());
		}
		if (!errores.isEmpty()) {
			throw new InvalidRegistrationException(errores);
		}

		passwordPolicy.validate(
				request.contrasena(),
				java.util.List.of(request.nombre(), request.apellidos(), request.email()));

		String email =
				request.email()
						.trim()
						.toLowerCase(Locale.ROOT);

		if (usuarioDAO.existsByEmail(email)) {

			throw new DuplicateRegistrationException();
		}

		Administrador administrador =
				new Administrador();

		administrador.setNombre(
				request.nombre().trim());

		administrador.setApellidos(
				request.apellidos().trim());

		administrador.setEmail(
				email);

		administrador.setSede(
				request.sede());

		administrador.setFechaIncorporacion(
				request.fechaIncorporacion());

		administrador.setImagenPerfil(
				request.imagenPerfil());

		administrador.setBloqueada(false);

		administrador.setActivada(true);

		administrador.registrarContrasenaHash(
				passwordEncoder.encode(
						request.contrasena()));

		try {

			Administrador guardado =
					administradorDAO.save(
							administrador);

			auditoriaService.registrarAltaAdministrador();

			if (favoritosRegistroService != null) {
				favoritosRegistroService.crearListaPredeterminada(
					guardado.getId()
				);
			}

			return new RegistroUsuarioResponse(
					guardado.getId(),
					"administrador");

		} catch (DuplicateKeyException exception) {

			throw new DuplicateRegistrationException();
		}
	}

	public void activarUsuario(String id) {

		Usuario usuario =
				usuarioDAO.findById(id)
						.orElseThrow(
								UsuarioNoEncontradoException::new);

		if (!usuario.isActivada()) {

			usuario.setActivada(true);

			usuarioDAO.save(usuario);

			auditoriaService.registrarUsuarioActivado(usuario.getId());
		}
	}

	public void bloquearUsuario(
			String id,
			String emailSolicitante) {

		if (emailSolicitante == null ||
				emailSolicitante.isBlank()) {

			throw new AccessDeniedException(
					MENSAJE_SOLICITANTE_NO_IDENTIFICADO);
		}

		Usuario usuario =
				usuarioDAO.findById(id)
						.orElseThrow(
								UsuarioNoEncontradoException::new);

		String emailNormalizado =
				emailSolicitante
						.trim()
						.toLowerCase(Locale.ROOT);

		if (emailNormalizado.equals(
				usuario.getEmail())) {

			throw new AutoBloqueoAdministradorException();
		}

		if (!usuario.isBloqueada()) {

			usuario.setBloqueada(true);

			usuarioDAO.save(usuario);

			sesionService.cerrarSesiones(
					usuario.getEmail());

			auditoriaService.registrarUsuarioBloqueado(usuario.getId());
		}
	}

	public void desbloquearUsuario(
			String id,
			String emailSolicitante) {

		if (emailSolicitante == null ||
				emailSolicitante.isBlank()) {

			throw new AccessDeniedException(
					MENSAJE_SOLICITANTE_NO_IDENTIFICADO);
		}

		Usuario usuario =
				usuarioDAO.findById(id)
						.orElseThrow(
								UsuarioNoEncontradoException::new);

		String emailNormalizado =
				emailSolicitante
						.trim()
						.toLowerCase(Locale.ROOT);

		if (emailNormalizado.equals(
				usuario.getEmail())) {

			throw new AutoBloqueoAdministradorException();
		}

		if (usuario.isBloqueada()) {

			usuario.setBloqueada(false);

			usuarioDAO.save(usuario);

			auditoriaService.registrarUsuarioDesbloqueado(usuario.getId());
		}
	}

	public void eliminarAdministrador(
			String id,
			String emailSolicitante) {

		if (emailSolicitante == null ||
				emailSolicitante.isBlank()) {

			throw new AccessDeniedException(
					MENSAJE_SOLICITANTE_NO_IDENTIFICADO);
		}

		if (id == null ||
				id.isBlank()) {

			throw new UsuarioNoEncontradoException();
		}

		Administrador objetivo =
				administradorDAO.findById(id)
						.orElseThrow(
								UsuarioNoEncontradoException::new);

		String emailNormalizado =
				emailSolicitante
						.trim()
						.toLowerCase(Locale.ROOT);

		if (emailNormalizado.equals(
				objetivo.getEmail())) {

			throw new AutoEliminacionAdministradorException();
		}

		if (administradorDAO
				.contarAdministradores() <= 1) {

			throw new UltimoAdministradorException();
		}

		administradorDAO.delete(objetivo);
		auditoriaService.registrarEliminacionUsuarioPorAdministrador("ADMINISTRADOR");

		sesionService.cerrarSesiones(
				objetivo.getEmail());
	}
}
