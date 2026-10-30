import type { TourKey } from './zh';

export const es: Record<TourKey, string> = {
  'tour.title': 'Recorrido guiado: un latido en diez pasos',
  'tour.intro':
    'Diez pasos a lo largo de un latido, desde la descarga del nodo sinusal hasta la diástole. Cada paso ajusta el corte, resalta las estructuras implicadas, selecciona una derivación clave y reproduce una vez a cámara lenta el intervalo de tiempo correspondiente, deteniéndose en su último fotograma.',
  'tour.start': 'Iniciar el recorrido',
  'tour.exit': 'Salir del recorrido',
  'tour.prev': 'Paso anterior',
  'tour.next': 'Paso siguiente',
  'tour.finish': 'Terminar',
  'tour.progress': 'Paso {n} de {total}',
  'tour.dots': 'Progreso del recorrido',
  'tour.goto': 'Ir al paso {n}: {title}',
  'tour.loop': 'Reproduciendo este intervalo ({ms} ms) una vez a {speed}×; se detiene en el último fotograma',
  'tour.ended': 'Detenido en el último fotograma de este intervalo ({ms} ms)',
  'tour.looping': 'Repetición automática: {speed}× ({ms} ms), con una pausa de 1,5 s tras cada pasada',
  'tour.replay': 'Repetir este paso',
  'tour.autoLoop': 'Repetición automática',
  'tour.keyMoment': 'Explicación del modelo en el momento clave de este paso (pausa para ver el instante actual)',
  'tour.lead': 'Derivación clave: {lead}',
  'tour.keys': 'Con el panel del recorrido enfocado, usa ← / → para cambiar de paso y Esc para salir.',
  'tour.live': 'Explicación del modelo en este instante',
  'tour.unavailable': 'El ciclo actual aún no tiene datos del modelo para este intervalo; reproduce unos segundos y vuelve a intentarlo.',

  'step.sa.title': '1. Descarga del nodo sinusal',
  'step.sa.body':
    'Cada latido empieza en el nodo sinusal, situado en el surco terminal, en la unión de la vena cava superior con la aurícula derecha; sus células se despolarizan de forma espontánea. El nodo es demasiado pequeño para que su descarga se vea en el ECG de superficie: ocurre justo antes del inicio de la onda P. Observa el techo de la aurícula derecha en 3D: el impulso sale de aquí.',
  'step.atria.title': '2. Despolarización auricular = onda P',
  'step.atria.body':
    'El impulso recorre el miocardio auricular a unos 0,8–1,0 m/s: primero la aurícula derecha, luego la izquierda a través del haz de Bachmann, y termina en la orejuela izquierda, en unos 80–110 ms. La primera parte de la onda P procede sobre todo de la aurícula derecha y la última, de la izquierda. El vector auricular medio se dirige hacia la izquierda y abajo, por lo que la P es positiva en II. Las aurículas empiezan a contraerse unos 40–60 ms después.',
  'step.avDelay.title': '3. Retraso en el nodo AV = segmento PR',
  'step.avDelay.body':
    'El anillo fibroso entre aurículas y ventrículos es un aislante eléctrico; el nodo auriculoventricular, en el vértice del triángulo de Koch, es la única vía de entrada a los ventrículos. Conduce despacio (unos 0,02–0,05 m/s) y produce un retraso de unos 50–120 ms (intervalo AH) que permite que la contracción auricular termine de llenar los ventrículos. El nodo tiene pocas células, así que el ECG de superficie permanece plano.',
  'step.hisPurkinje.title': '4. Haz de His, ramas y fibras de Purkinje',
  'step.hisPurkinje.body':
    'El impulso atraviesa el cuerpo fibroso central por el haz de His, que se divide en la rama izquierda (con fascículos anterior, posterior y septal) y la rama derecha (que llega al músculo papilar anterior por la banda moderadora), y después entra en la red subendocárdica de Purkinje (2–4 m/s). Del haz de His al miocardio ventricular hay unos 35–55 ms (intervalo HV). Estas fibras también son demasiado finas para verse, por lo que el segmento PR sigue siendo isoeléctrico.',
  'step.septum.title': '5. El tabique se activa primero = inicio del QRS',
  'step.septum.body':
    'Las ramificaciones de la rama izquierda llegan primero a la parte media de la cara izquierda del tabique, de modo que este se despolariza de izquierda a derecha y el vector se dirige hacia la derecha y adelante. Esto produce una pequeña onda r en V1 y pequeñas ondas q en I, aVL, V5 y V6 («ondas q septales»). Observa el corte de eje corto: el frente atraviesa el tabique desde el lado del ventrículo izquierdo.',
  'step.apexFreeWalls.title': '6. Ápex y paredes libres = deflexión principal',
  'step.apexFreeWalls.body':
    'La red de Purkinje hace que el ápex y las paredes libres de ambos ventrículos se despolaricen casi a la vez, de endocardio a epicardio. Predomina el ventrículo izquierdo, más grueso, y el vector se dirige hacia la izquierda, abajo y atrás: ondas R altas en II, V5 y V6 y una S profunda en V1. El epicardio del ventrículo derecho es el primero en activarse, unos 20–25 ms después del inicio del QRS. Hacia este momento se cierran las válvulas mitral y tricúspide (primer ruido) y empieza la contracción isovolumétrica.',
  'step.baseRvot.title': '7. Base y tracto de salida del VD = deflexión terminal',
  'step.baseRvot.body':
    'La región posterobasal del ventrículo izquierdo y el tracto de salida del ventrículo derecho, que la red de Purkinje no cubre, se activan los últimos (unos 60–90 ms después del inicio del QRS). El vector restante es pequeño y gira hacia atrás y arriba, lo que produce la pequeña onda s terminal en I, V5 y V6. Después todo el miocardio ventricular está despolarizado y el QRS termina.',
  'step.plateau.title': '8. Meseta = segmento ST',
  'step.plateau.body':
    'Las células ventriculares están en la meseta del potencial de acción: todas están despolarizadas a un potencial similar, no hay diferencia de potencial neta, el vector cardíaco es casi nulo y el segmento ST queda en la línea de base. Mecánicamente, las válvulas aórtica y pulmonar están abiertas y los ventrículos expulsan la sangre. Cualquier desplazamiento del ST respecto a la línea de base es un signo importante de lesión miocárdica.',
  'step.repolarization.title': '9. Repolarización ventricular = onda T',
  'step.repolarization.body':
    'Los potenciales de acción del epicardio son más cortos que los del endocardio, y los del ápex más cortos que los de la base, de modo que la repolarización avanza del epicardio al endocardio y del ápex a la base. Tanto su sentido de avance como la polaridad de su frente son opuestos a los de la despolarización; las dos inversiones se compensan y la onda T normal apunta en el mismo sentido que la deflexión principal del QRS. La válvula aórtica se cierra hacia el final de la T (segundo ruido).',
  'step.diastole.title': '10. Diástole = segmento TP',
  'step.diastole.body':
    'Aurículas y ventrículos han vuelto a su potencial de reposo y no hay actividad eléctrica; el segmento TP es el mejor lugar para valorar la línea de base. Mecánicamente, los ventrículos se relajan de forma isovolumétrica y después se abren las válvulas mitral y tricúspide y la sangre llena los ventrículos hasta la siguiente descarga del nodo sinusal.',
};
