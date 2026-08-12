# Términos adicionales (AGPL-3.0, sección 7(b))

Lumina Calendar se distribuye bajo la GNU Affero General Public License v3.0
(archivo [`LICENSE`](LICENSE)), con el siguiente término adicional autorizado
expresamente por su sección 7(b):

> Toda copia, obra derivada o despliegue accesible en red de este programa debe
> conservar, de forma visible para la persona que lo use, el aviso de atribución
> que aparece en la pantalla «Acerca de» de la aplicación y en el archivo
> [`NOTICE`](NOTICE):
>
> **Lumina Calendar — creado por Diego Luis Álvarez García y Santiago Quiroz Upegui.**
>
> Eliminar, ocultar, degradar o hacer inaccesible ese aviso constituye una
> violación de esta licencia y termina automáticamente los derechos que ella
> concede, conforme a la sección 8 de la AGPL-3.0.

## Qué significa esto en la práctica

Podés hacer todo lo que la AGPL permite:

- usar Lumina para lo que quieras, incluso comercialmente;
- estudiar el código y modificarlo;
- redistribuir copias, modificadas o no;
- hospedarlo para otras personas.

La única obligación adicional es de crédito: el aviso de autoría tiene que
seguir siendo visible dentro de la aplicación. No hace falta pedir permiso, no
hay regalías y no hay restricción de uso comercial.

Como recordatorio de lo que la propia AGPL ya exige: si hospedás una versión
modificada y otras personas la usan a través de la red, tenés que ofrecerles el
código fuente correspondiente.

## Implementación

El aviso vive en el componente `src/ui/AttributionNotice.tsx` y se muestra en la
pantalla «Acerca de» y al pie de «Ajustes». Hay una prueba automatizada
(`src/ui/AttributionNotice.test.tsx`) que falla si el crédito desaparece.
