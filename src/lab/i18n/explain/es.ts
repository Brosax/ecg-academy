import type { ExplainKey } from './zh';

export const es: Record<ExplainKey, string> = {
  'dir.left': 'la izquierda',
  'dir.right': 'la derecha',
  'dir.inferior': 'abajo',
  'dir.superior': 'arriba',
  'dir.anterior': 'delante',
  'dir.posterior': 'atrás',
  'dir.join1': 'hacia {a}',
  'dir.join2': 'hacia {a} y {b}',
  'dir.join3': 'hacia {a}, {b} y {c}',
  'list.sep': ', ',
  'sentence.sep': ' ',

  'ctx.P':
    'Durante la onda P: el nodo sinusal se activa y las aurículas se despolarizan de derecha a izquierda (la primera parte de la P procede sobre todo de la aurícula derecha y la última, de la izquierda).',
  'ctx.PR':
    'Durante el segmento PR: el impulso se retrasa en el nodo auriculoventricular y después desciende rápidamente por el haz de His, sus ramas y las fibras de Purkinje; estas estructuras son demasiado pequeñas para registrarse en el ECG de superficie.',
  'ctx.QRS.early': 'QRS inicial: el tabique interventricular se despolariza primero y el frente lo atraviesa de izquierda a derecha.',
  'ctx.QRS.mid':
    'QRS medio: el ápex y las paredes libres de ambos ventrículos se despolarizan de endocardio a epicardio; predomina el ventrículo izquierdo.',
  'ctx.QRS.late':
    'QRS final: las últimas regiones en despolarizarse son la región posterobasal del ventrículo izquierdo y el tracto de salida del ventrículo derecho.',
  'ctx.ST': 'Durante el segmento ST: todo el miocardio ventricular está en la fase de meseta, con un potencial similar.',
  'ctx.T': 'Durante la onda T: los ventrículos se repolarizan; el epicardio antes que el endocardio y el ápex antes que la base.',
  'ctx.TP': 'Durante el segmento TP: aurículas y ventrículos están en reposo (diástole eléctrica).',
  'ctx.none': 'Este instante no está dentro de un segmento conocido de un ciclo cardíaco completo.',

  // short forms of ctx.* for the one-sentence caption under the heart (≤ 110 characters)
  'cap.P': 'Onda P: el nodo sinusal se activa y las aurículas se despolarizan de derecha a izquierda.',
  'cap.PR': 'Segmento PR: el impulso se retrasa en el nodo AV y baja por His–Purkinje, sin señal visible en el ECG.',
  'cap.QRS.early': 'QRS inicial: el tabique interventricular se despolariza primero, de izquierda a derecha.',
  'cap.QRS.mid': 'QRS medio: el ápex y las paredes libres se despolarizan de endocardio a epicardio; predomina el VI.',
  'cap.QRS.late': 'QRS final: se despolarizan por último la región posterobasal del VI y el tracto de salida del VD.',
  'cap.ST': 'Durante el segmento ST: todo el miocardio ventricular está en la fase de meseta, con un potencial similar.',
  'cap.T': 'Onda T: los ventrículos se repolarizan; el epicardio antes que el endocardio y el ápex antes que la base.',
  'cap.TP': 'Durante el segmento TP: aurículas y ventrículos están en reposo (diástole eléctrica).',
  'cap.none': 'Este instante no está dentro de un segmento conocido de un ciclo cardíaco completo.',
  'active.list': 'Estructuras activas ahora: {list}.',

  'h.zero': 'El vector cardíaco es casi nulo ({mag} mV): no hay diferencia de potencial neta dentro del corazón.',
  'h.dir': 'El vector cardíaco H apunta {dirs} (ángulo en el plano frontal {ang}; en el plano horizontal {hang}); magnitud {mag} mV.',
  'lead.axis.limb': 'El eje de la derivación {lead} (hacia su polo positivo) apunta {dirs} (ángulo frontal {ang}); sensibilidad |L| = {mag}.',
  'lead.axis.prec': 'El eje de la derivación {lead} (hacia su polo positivo) apunta {dirs} (ángulo horizontal {hang}); sensibilidad |L| = {mag}.',
  'proj': 'El ángulo entre H y el eje de la derivación es de {theta}° → proyección = |H|·|L|·cos θ = {v} mV.',
  'iso.perp': 'H es casi perpendicular al eje de esta derivación, así que la proyección es casi nula.',
  'iso.small': 'La proyección es demasiado pequeña para verse en el trazado.',
  'iso.zero': 'Sin vector cardíaco, todas las derivaciones quedan en la línea de base.',
  'defl.result': '→ Derivación {lead}: {word}{wave}.',
  'word.up': 'deflexión positiva (hacia arriba)',
  'word.down': 'deflexión negativa (hacia abajo)',
  'word.iso': 'casi isoeléctrica',
  'wave.is': '; corresponde a {name}',
  'wn.P': 'la onda P',
  'wn.T': 'la onda T',
  'wn.Q': 'una onda Q',
  'wn.q': 'una pequeña onda q',
  'wn.R': 'la onda R',
  'wn.r': 'una pequeña onda r',
  'wn.R2': 'la onda R′',
  'wn.r2': 'una pequeña onda r′',
  'wn.S': 'la onda S',
  'wn.s': 'una pequeña onda s',
  'wn.QS': 'un complejo QS',
  'angles.note': 'Convención de ángulos: plano frontal 0° = izquierda, +90° = inferior; plano horizontal 0° = izquierda, +90° = anterior.',

  'segx.P':
    'La onda P es la despolarización auricular. El impulso nace en el nodo sinusal, en la unión de la vena cava superior con la aurícula derecha; activa primero la aurícula derecha, llega a la izquierda por el haz de Bachmann y termina en la orejuela izquierda. El vector auricular medio se dirige hacia la izquierda y abajo, por lo que la P es positiva en I, II y aVF, negativa en aVR y a menudo bifásica en V1.',
  'segx.PR':
    'El segmento PR es isoeléctrico: el impulso atraviesa lentamente el nodo auriculoventricular (unos 0,02–0,05 m/s), lo que da tiempo a que las aurículas se contraigan y terminen de llenar los ventrículos; después recorre rápidamente el haz de His, sus ramas y las fibras de Purkinje (intervalo HV de unos 35–55 ms). Estos tejidos de conducción son demasiado pequeños para producir una onda visible en el ECG de superficie.',
  'segx.QRS':
    'El complejo QRS es la despolarización ventricular. Primero se activa la cara izquierda del tabique y el frente lo atraviesa de izquierda a derecha, con un vector dirigido hacia la derecha y adelante: pequeñas ondas q en I, aVL y V5–V6 y una pequeña onda r en V1. Después se despolarizan el ápex y las paredes libres de ambos ventrículos, de endocardio a epicardio; predomina el ventrículo izquierdo y el vector se dirige hacia la izquierda, abajo y atrás, lo que genera la onda R principal en II, V5 y V6 y la S profunda en V1. Por último se activan la región posterobasal del ventrículo izquierdo y el tracto de salida del ventrículo derecho; el vector gira hacia atrás y arriba y produce la onda s terminal.',
  'segx.ST':
    'El segmento ST corresponde a la meseta del potencial de acción: todas las células ventriculares están despolarizadas a un potencial similar, no hay diferencia de potencial neta, el vector cardíaco es casi nulo y el segmento ST queda en la línea de base.',
  'segx.T':
    'La onda T es la repolarización ventricular. Los potenciales de acción del epicardio son más cortos que los del endocardio, y los del ápex más cortos que los de la base, de modo que la repolarización avanza del epicardio al endocardio, en sentido contrario a la despolarización. Como el frente de repolarización tiene además la polaridad opuesta, ambas inversiones se compensan: el vector de repolarización apunta aproximadamente en la misma dirección que el de despolarización y la onda T normal es concordante con el QRS.',
  'segx.TP':
    'El segmento TP es la diástole eléctrica: aurículas y ventrículos están en su potencial de reposo, sin actividad eléctrica; es el mejor lugar para valorar la línea de base. Mecánicamente, los ventrículos se relajan de forma isovolumétrica y después se llenan.',
  'segx.structs': 'Estructuras implicadas: {list}.',
  'segx.dur': 'En este latido dura unos {ms} ms.',
  'segx.mech': 'Fenómenos mecánicos simultáneos: {list}.',

  'm.p': 'Onda P {shape} (pico {peak} mV): el vector auricular medio apunta {dirs}, a {theta}° del eje de esta derivación.',
  'm.qrs':
    'QRS con morfología {pattern}, predominantemente {main}: el vector QRS medio apunta {dirs} (ángulo frontal {ang}), a {theta}° del eje de esta derivación (< 90° → positivo; > 90° → negativo).',
  'm.t': 'Onda T {shape} (pico {peak} mV), {conc}; ángulo QRS-T espacial de {qrst}°.',
  'm.none': 'Todavía no hay un ciclo cardíaco completo para analizar.',
  'shape.up': 'positiva',
  'shape.down': 'negativa',
  'shape.biphasic': 'bifásica',
  'shape.flat': 'aplanada',
  'main.pos': 'positivo',
  'main.neg': 'negativo',
  'main.equi': 'isodifásico',
  'conc.yes': 'concordante con la deflexión principal del QRS',
  'conc.no': 'discordante con la deflexión principal del QRS',
  'conc.na': 'el QRS es isodifásico, así que la concordancia no se define',
};
