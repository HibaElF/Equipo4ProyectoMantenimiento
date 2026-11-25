package es.uclm.esibuy.backend.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dao.AlmacenAuditoria;
import es.uclm.esibuy.backend.dto.ListadoAuditoriaResponse;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;

// Consulta de solo lectura del registro de auditoría. Solo ADMIN: la ruta cuelga de
// /administrador/**, que ya exige ese rol, y se refuerza con @PreAuthorize.
@RestController
@RequestMapping("/administrador/auditoria")
public class AuditoriaController {

	static final int TAMANO_MAXIMO = 100;

	private final AlmacenAuditoria almacen;

	public AuditoriaController(AlmacenAuditoria almacen) {
		this.almacen = almacen;
	}

	@GetMapping
	@PreAuthorize("hasRole('ADMIN')")
	public ResponseEntity<ListadoAuditoriaResponse> consultar(
			@RequestParam(defaultValue = "0") int pagina,
			@RequestParam(defaultValue = "20") int tamano) {
		if (pagina < 0 || tamano < 1 || tamano > TAMANO_MAXIMO) {
			throw new DatosNoValidosException(
					"La página debe ser positiva y el tamaño estar entre 1 y " + TAMANO_MAXIMO + ".");
		}
		List<ListadoAuditoriaResponse.Evento> eventos = almacen.consultar(pagina, tamano).stream()
				.map(ListadoAuditoriaResponse.Evento::desde)
				.toList();
		return ResponseEntity.ok(new ListadoAuditoriaResponse(eventos, pagina, tamano, almacen.contar()));
	}
}
