# Notas del lab n8n y Webhooks

## Flujo implementado

El flujo final creado en n8n sigue esta estructura:

Webhook Trigger
→ Code in JavaScript
→ Crypto / Calcular firma HMAC
→ HTTP Request a la API Express
→ Respond to Webhook

El objetivo del flujo es recibir datos de una película mediante un webhook, validarlos, generar una firma HMAC SHA256 y enviarlos a la API Express para registrar la película en PostgreSQL.

## Seguridad mediante HMAC

Para proteger el endpoint de webhooks, se utiliza una firma HMAC SHA256.  
n8n genera la firma usando un secreto compartido y la envía en la cabecera:

`x-webhook-signature`

La API Express recibe el body, calcula de nuevo la firma usando el mismo secreto y compara ambas firmas. Si no coinciden, rechaza la petición.

## Idempotencia

Cada evento enviado desde n8n incluye un `event_id`.

Antes de crear una película, la API comprueba si ese `event_id` ya existe en la tabla `webhook_eventos`.  
Si el evento ya existe, la API responde que ya fue procesado y no vuelve a insertar la película.

Esto evita duplicados si n8n reintenta enviar el mismo evento varias veces.

## Transacciones

En el endpoint de nueva película se utiliza una transacción para agrupar el registro del evento y la creación de la película.

Si una parte del proceso falla, se ejecuta `ROLLBACK` y no quedan datos guardados a medias.  
Esto ayuda a mantener la base de datos coherente.

## Problema encontrado con n8n y crypto

Durante el desarrollo, el nodo Code de n8n no permitía importar el módulo `crypto`, mostrando el error:

`Module 'crypto' is disallowed`

Esto ocurrió porque n8n bloquea algunos módulos por seguridad en entornos self-hosted.

La solución fue iniciar n8n permitiendo el módulo `crypto` con la variable de entorno:

`NODE_FUNCTION_ALLOW_BUILTIN=crypto`

Después de reiniciar n8n con esa configuración, el nodo Code pudo calcular correctamente la firma HMAC.

## Pruebas realizadas

Se comprobó que:

- n8n recibe correctamente los datos desde PowerShell.
- La firma HMAC se genera correctamente.
- Express recibe el body esperado.
- Express valida la firma recibida.
- La película se registra en PostgreSQL.
- El evento queda registrado en `webhook_eventos`.
- Si se repite el mismo evento, no se duplica la película.