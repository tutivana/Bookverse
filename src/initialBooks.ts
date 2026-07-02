import { Book } from "./types";

export const INITIAL_BOOKS: Book[] = [
  {
    id: "dom-casmurro",
    title: "Dom Casmurro",
    author: "Machado de Assis",
    category: "Clássico",
    description: "Uma das maiores obras da literatura brasileira. Bento Santiago, o Dom Casmurro, narra em primeira pessoa suas memórias, sua infância na Rua de Matacavalos, seu amor por Capitu e a atormentadora dúvida sobre a fidelidade de sua amada com seu melhor amigo, Escobar.",
    pages: 6,
    estimatedReadTime: "45m",
    audiobookAvailable: true,
    audioDuration: "1h 15m",
    coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop",
    language: "Português",
    publishDate: "1899",
    pdfContent: [
      "Capítulo I - Do título.\n\nUma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou do tempo, dos partidos e dos bondes, e acabou por me perguntar se eu continuava a escrever no jornal. Respondi-lhe que sim. Ele então começou a recitar-me uns versos, que dizia serem seus, mas que eu vi logo que eram de outro. Eu não disse nada, mas ele percebeu o meu desdém e resolveu vingar-se de mim. Chamou-me de 'Dom Casmurro'.\n\nNão consultes dicionários. Casmurro não está aqui no sentido que eles lhe dão, mas no que lhe pôs o vulgo de homem calado e metido consigo. Dom veio por ironia, para imputar-me ares de fidalgo. Tudo por estar calado e não ouvir os versos dele. O apelido pegou, e é por isso que dou este título ao meu livro.",
      "Capítulo II - Do livro.\n\nO meu fim principal é atar as duas pontas da vida, e restaurar na velhice a adolescência. Pois, senhor, não consegui recompor o que foi nem o que fui. Em tudo, se a cara é a mesma, a fisionomia é outra. Se a minha memória guarda os fatos, a sensação deles escapou-me. Se eu pudesse reviver aqueles dias, juro que não escreveria uma só linha deste livro. Mas não posso. Falta-me o vigor, a fé, a ilusão doce que doura a juventude.\n\nComo não fiz o que desejava, que era viver aqueles anos de novo, ponho no papel o que me resta na lembrança. Talvez assim eu consiga sentir de novo um pouco daquela felicidade antiga, ainda que seja apenas por reflexo. Escrevo para mim, e para os poucos amigos que me restam, se é que me resta algum.",
      "Capítulo III - A denúncia.\n\nIa a entrar na sala de visitas, quando ouvi proferir o meu nome e escondi-me atrás da porta. Era a voz de José Dias, o nosso agregado, que falava com minha mãe, Dona Glória: 'Dona Glória, a senhora precisa mandar o Bentinho para o seminário. Ele está crescendo e o projeto de fazê-lo padre não deve ser esquecido. Além disso, ele anda muito tempo com a filha do Pádua, a Capitu. Eles estão sempre juntos, cochichando pelos cantos. É preciso cortar isso antes que seja tarde.'\n\nMinha mãe estremeceu. Ela fizera uma promessa de me fazer padre se eu nascesse homem e vivesse. A denúncia de José Dias caiu como uma bomba no meu coração. Eu tinha então quinze anos, e Capitu, quatorze. Até aquele momento, eu não sabia que a amava, mas a simples ideia de ser separado dela e mandado para um seminário revelou-me a verdade.",
      "Capítulo IV - A promessa de Dona Glória.\n\nMinha mãe era uma santa mulher, viúva desde muito jovem, que vivia para cuidar de mim e da nossa casa. A promessa que fizera era o seu grande fardo e a sua grande devoção. José Dias sabia disso e usava essa promessa para manter sua influência sobre nós. Ele era um homem culto, que falava por superlativos, sempre elogiando tudo e todos, mas que no fundo sabia manipular as fraquezas humanas.\n\nQuando ouvi minha mãe concordar que era hora de me mandar para o seminário, meu mundo desabou. Corri para o quintal, para o nosso refúgio perto do muro que separava a nossa casa da de Capitu. Eu precisava vê-la, precisava contar-lhe o que estava acontecendo. Nós precisávamos encontrar uma saída juntos.",
      "Capítulo V - O muro e o quintal.\n\nO quintal de nossa casa era grande, cheio de árvores frutíferas. Ao fundo, um muro baixo nos separava da casa de Pádua, um modesto funcionário público, pai de Capitu. Esse muro era o nosso ponto de encontro. Nós costumávamos conversar por cima dele, trocar bilhetes e planejar nossas pequenas travessuras. Capitu era uma menina extraordinária, com olhos 'de ressaca', como diria mais tarde José Dias, olhos que pareciam uma onda que avança e recua, engolindo quem os olhasse.\n\nEla tinha uma inteligência viva, muito superior à minha. Enquanto eu chorava e me desesperava com a notícia do seminário, ela já estava pensando em como poderíamos convencer minha mãe a mudar de ideia. 'Não chore, Bentinho', disse ela, segurando minha mão sobre o muro. 'Nós vamos dar um jeito. Você não vai ser padre.'",
      "Capítulo VI - Os olhos de ressaca.\n\nTive medo de olhar para Capitu, mas olhei. Ela olhava para mim com uma expressão de tamanha força e decisão que me senti pequeno perto dela. Seus olhos de ressaca me atraíam e me assustavam ao mesmo tempo. Havia neles uma energia misteriosa, uma vontade indomável.\n\n'Vamos falar com José Dias', propôs ela. 'Ele é quem tem influência sobre sua mãe. Se conseguirmos convencê-lo de que você não tem vocação para padre, ele mesmo dirá isso a ela.' Capitu já estava traçando um plano de mestre, manipulando o próprio homem que nos denunciara. Naquele momento, compreendi que meu destino estava para sempre ligado àquela menina de olhar enigmático."
    ],
    audioChapters: [
      { title: "Capítulo I - Do título", startPage: 0, durationSeconds: 150 },
      { title: "Capítulo II - Do livro", startPage: 1, durationSeconds: 180 },
      { title: "Capítulo III - A denúncia", startPage: 2, durationSeconds: 220 },
      { title: "Capítulo IV - A promessa", startPage: 3, durationSeconds: 200 },
      { title: "Capítulo V - O muro", startPage: 4, durationSeconds: 190 },
      { title: "Capítulo VI - Os olhos de ressaca", startPage: 5, durationSeconds: 210 }
    ]
  },
  {
    id: "pequeno-principe",
    title: "O Pequeno Príncipe",
    author: "Antoine de Saint-Exupéry",
    category: "Fantasia",
    description: "Um piloto cujo avião cai no deserto do Saara encontra um jovem príncipe que viajou de asteroide em asteroide. Uma fábula poética e filosófica sobre a solidão, a amizade, o amor e a perda, contada através do olhar puro de uma criança.",
    pages: 5,
    estimatedReadTime: "30m",
    audiobookAvailable: true,
    audioDuration: "45m",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop",
    language: "Português",
    publishDate: "1943",
    pdfContent: [
      "Capítulo I - O desenho da jiboia.\n\nCerta vez, quando eu tinha seis anos, vi uma imagem magnífica num livro sobre a Floresta Virgem, que se chamava Histórias Vividas. Representava uma jiboia engolindo uma fera. O livro dizia: 'As jiboias engolem a sua presa inteirinha, sem mastigar. Depois não podem mover-se e dormem durante os seis meses da digestão.'\n\nRefleti muito sobre as aventuras da selva e, por minha vez, consegui desenhar, com um lápis de cor, o meu primeiro desenho. Mostrei a minha obra-prima às pessoas grandes e perguntei se o meu desenho lhes dava medo. Elas responderam: 'Por que um chapéu daria medo?' Meu desenho não representava um chapéu. Representava uma jiboia digerindo um elefante. Desenhei então o interior da jiboia, para que as pessoas grandes pudessem compreender. Elas sempre necessitam de explicações.",
      "Capítulo II - O encontro no Saara.\n\nVivi assim, só, sem ninguém com quem pudesse falar de verdade, até que tive uma pane no deserto do Saara, há seis anos. Algo se quebrara no motor do meu avião. E como não tinha comigo mecânico nem passageiros, preparei-me para realizar, sozinho, um difícil conserto. Era, para mim, questão de vida ou morte. Água de beber, eu só tinha para oito dias.\n\nNa primeira noite, adormeci sobre a areia, a mil milhas de qualquer terra habitada. Estava mais isolado que um náufrago numa jangada no meio do oceano. Imaginem, pois, a minha surpresa, quando, ao amanhecer, uma vozinha estranha me acordou. Dizia: 'Por favor... desenha-me um carneiro!'",
      "Capítulo III - O carneiro na caixa.\n\nColoquei-me de pé, como se tivesse sido atingido por um raio. Esfreguei bem os olhos. Olhei ao meu redor. E vi um homenzinho extraordinário que me examinava com toda a seriedade. Olhei para aquela aparição com olhos cheios de espanto. Não se esqueçam de que eu me encontrava a mil milhas de qualquer região habitada.\n\nComo eu não sabia desenhar um carneiro, fiz para ele o meu desenho da jiboia fechada. E fiquei estupefato ao ouvir o garoto responder: 'Não! Não! Eu não quero um elefante numa jiboia. A jiboia é muito perigosa, e o elefante ocupa muito espaço. Onde eu vivo tudo é muito pequeno. Eu preciso é de um carneiro. Desenha-me um carneiro!'\n\nDesenhei vários carneiros, mas ele recusou todos. Já impaciente, desenhei uma caixa e disse: 'Esta é a caixa. O carneiro que você quer está aí dentro.' E fiquei surpreso ao ver o rosto do meu jovem juiz iluminar-se: 'Era exatamente assim que eu queria!'",
      "Capítulo IV - O Asteroide B-612.\n\nLevei muito tempo para compreender de onde ele vinha. O principezinho, que me fazia centenas de perguntas, nunca parecia ouvir as minhas. Foram palavras pronunciadas ao acaso que, pouco a pouco, revelaram tudo.\n\nAssim, quando viu meu avião pela primeira vez, perguntou-me de que planeta eu vinha. Compreendi então que o seu próprio planeta devia ser minúsculo. Tenho sérias razões para acreditar que o planeta de onde vinha o principezinho era o Asteroide B-612. Esse asteroide só foi visto uma vez ao telescópio, em 1909, por um astrônomo turco, que fez na época uma grande demonstração de sua descoberta num Congresso Internacional de Astronomia. Mas ninguém acreditara nele por causa de suas roupas turcas. As pessoas grandes são assim.",
      "Capítulo V - Os baobás.\n\nA cada dia eu aprendia algo mais sobre o seu planeta, sobre a sua partida, sobre a sua viagem. Foi assim que conheci, no terceiro dia, o drama dos baobás.\n\nNo planeta do principezinho, como em todos os planetas, havia ervas boas e ervas más. Consequentemente, sementes boas de ervas boas e sementes rés de ervas rés. Ora, as sementes são invisíveis. Elas dormem no segredo da terra até que uma delas decida despertar. Se for uma planta ruim, é preciso arrancá-la imediatamente, logo que se possa distingui-la. Ora, havia sementes terríveis no planeta do principezinho: as sementes de baobá. O solo do planeta estava infestado delas. E se não arrancarmos um baobá a tempo, ele cresce, ocupa todo o espaço e suas raízes podem perfurar o planeta inteiro. 'É uma questão de disciplina', dizia-me mais tarde o principezinho."
    ],
    audioChapters: [
      { title: "Capítulo I - O desenho da jiboia", startPage: 0, durationSeconds: 120 },
      { title: "Capítulo II - O encontro no Saara", startPage: 1, durationSeconds: 160 },
      { title: "Capítulo III - O carneiro na caixa", startPage: 2, durationSeconds: 150 },
      { title: "Capítulo IV - O Asteroide B-612", startPage: 3, durationSeconds: 140 },
      { title: "Capítulo V - Os baobás", startPage: 4, durationSeconds: 170 }
    ]
  },
  {
    id: "a-metamorfose",
    title: "A Metamorfose",
    author: "Franz Kafka",
    category: "Ficção",
    description: "Gregor Samsa, um caixeiro-viajante, acorda certa manhã e se descobre transformado em um inseto monstruoso. Uma narrativa brilhante, claustrofóbica e tragicômica sobre a alienação moderna, as pressões familiares e o absurdo da existência humana.",
    pages: 4,
    estimatedReadTime: "40m",
    audiobookAvailable: true,
    audioDuration: "1h 00m",
    coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop",
    language: "Português",
    publishDate: "1915",
    pdfContent: [
      "Capítulo I - A transformação de Gregor.\n\nQuando Gregor Samsa despertou, certa manhã, de um sonho agitado, viu-se em sua cama transformado em um inseto monstruoso. Deitara-se de costas, que eram duras como uma couraça, e, ao erguer um pouco a cabeça, viu seu ventre abaulado, escuro, dividido por nervuras arqueadas.\n\nAs suas numerosas pernas, lamentavelmente finas em comparação com o resto do seu corpo, vibravam sem controle diante de seus olhos. 'O que aconteceu comigo?', pensou ele. Não era um sonho. O seu quarto, um verdadeiro quarto de ser humano, embora um pouco pequeno, permanecia tranquilo entre as quatro paredes familiares.",
      "Capítulo II - O relógio e o trabalho.\n\nGregor olhou para a janela. O tempo chuvoso — ouviam-se as gotas batendo no zinco da calha — deixava-o bastante melancólico. 'Que tal se eu dormisse mais um pouco e esquecesse todas estas bobagens?', pensou. Mas isso era totalmente impossível, pois ele estava habituado a dormir do lado direito, e em seu estado atual não conseguia adotar essa posição.\n\nOlhou para o despertador que tiquetaqueava na mesa de cabeceira. Meu Deus! Eram seis horas e meia, e os ponteiros continuavam a avançar. Já passava da hora! O trem das sete deveria ser pego, e para isso Gregor precisaria se apressar extraordinariamente. A sua ausência provocaria as maiores suspeitas no escritório, já que ele nunca faltara em cinco anos de serviço.",
      "Capítulo III - A voz da família.\n\nEnquanto Gregor pensava em tudo isso com a máxima pressa, sem conseguir se decidir a sair da cama, bateu de leve na porta da cabeceira de sua cama a sua mãe: 'Gregor, são seis e quinze. Você não vai viajar?' Que voz doce! Gregor assustou-se ao ouvir a própria voz responder.\n\nEra, sem dúvida, a sua voz anterior, mas misturada com um sibilar doloroso, que vinha do fundo de sua garganta, e que só deixava as palavras claras no primeiro instante para depois destruí-las. 'Sim, sim, obrigado, mãe, já estou me levantando', disse Gregor. Através da porta de madeira, a mudança na voz não foi percebida lá fora, e sua mãe retirou-se tranquila.",
      "Capítulo IV - O gerente chega.\n\nInfelizmente, a tranquilidade não durou muito. Pouco depois das sete, a campainha da casa tocou. Era o gerente da firma de Gregor, que viera pessoalmente cobrar a sua ausência. A família entrou em pânico, implorando para que Gregor abrisse a porta do quarto.\n\nGregor arrastou seu corpo pesado até a porta, usando suas mandíbulas para girar a chave na fechadura. Quando a porta finalmente se abriu e ele apareceu, o gerente soltou um 'Oh!' de pavor e cobriu a boca com a mão. Sua mãe caiu de joelhos e seu pai cerrou os punhos com agressividade. Gregor compreendeu que sua vida nunca mais seria a mesma."
    ],
    audioChapters: [
      { title: "Capítulo I - A transformação", startPage: 0, durationSeconds: 180 },
      { title: "Capítulo II - O relógio e o trabalho", startPage: 1, durationSeconds: 200 },
      { title: "Capítulo III - A voz da família", startPage: 2, durationSeconds: 160 },
      { title: "Capítulo IV - O gerente chega", startPage: 3, durationSeconds: 220 }
    ]
  },
  {
    id: "o-alienista",
    title: "O Alienista",
    author: "Machado de Assis",
    category: "Sátira",
    description: "O renomado médico Dr. Simão Bacamarte estabelece a 'Casa Verde', o primeiro hospício da vila de Itaguaí, dedicando-se ao estudo científico da loucura. No entanto, sua busca obsessiva por uma definição universal de sanidade o leva a internar quase toda a população da cidade.",
    pages: 4,
    estimatedReadTime: "35m",
    audiobookAvailable: false,
    coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop",
    language: "Português",
    publishDate: "1882",
    pdfContent: [
      "Capítulo I - De como Itaguaí ganhou uma casa de orates.\n\nAs crônicas da vila de Itaguaí dizem que em tempos remotos vivera ali um médico, o Dr. Simão Bacamarte, filho da nobreza local e o maior médico do Brasil e de Portugal. Tendo estudado em Coimbra e Pádua, resolveu estabelecer-se em sua terra natal, recusando convites para cargos na corte de Lisboa.\n\nAos quarenta anos casou-se com D. Evarista da Costa e Mascarenhas, viúva de trinta e quatro, não por beleza nem graça, mas porque reuniu excelentes condições fisiológicas para dar-lhe filhos robustos e inteligentes. Infelizmente, os filhos não vieram, e Simão Bacamarte entregou-se de corpo e alma à ciência da mente.",
      "Capítulo II - A fundação da Casa Verde.\n\nSimão Bacamarte percebeu que a loucura, que antes era tratada com desprezo ou trancada em porões familiares, merecia um estudo rigoroso e isolado. Propôs à Câmara de Itaguaí a criação de um asilo de loucos, que chamou de Casa Verde, devido à cor das janelas.\n\nA Câmara aprovou o projeto com entusiasmo, cobrando um imposto sobre o uso de penachos de cavalos em enterros para financiar a construção. Em poucos meses, a Casa Verde estava pronta, com galerias imensas, pátios de recreação e forte segurança. De toda a região começaram a chegar os primeiros orates, e o alienista iniciou suas profundas classificações científicas.",
      "Capítulo III - A teoria da loucura amplia-se.\n\nAté então, a loucura era considerada uma ilha no oceano da razão. Simão Bacamarte, no entanto, começou a suspeitar de que a razão é que era uma pequena ilha cercada por um imenso oceano de loucura. Ele postulou que a demência não era a exceção, mas a regra.\n\nCom essa nova hipótese na cabeça, o médico passou a examinar os cidadãos comuns da vila sob uma ótica implacável. Qualquer desvio de conduta, qualquer vaidade excessiva, superstição ou generosidade fora do comum era interpretada como sintoma de desequilíbrio mental. O farmacêutico Crispim Soares foi o primeiro a tremer, mas logo as internações atingiram figuras ilustres.",
      "Capítulo IV - A rebelião dos Canjicas.\n\nA vila de Itaguaí, aterrorizada com as constantes internações efetuadas pelo Dr. Bacamarte, começou a se revoltar. Um barbeiro chamado Porfírio, apelidado de 'Canjica', liderou uma revolta popular contra o alienista, exigindo o fechamento da Casa Verde.\n\nOs revoltosos marcharam pelas ruas gritando contra a ditadura médica, mas Simão Bacamarte os recebeu com tamanha calma e argumentos científicos que a multidão acabou dispersando. No final das contas, o próprio Porfírio, ao assumir o poder temporário na vila, foi seduzido pela autoridade do cientista e acabou apoiando novas internações, selando o destino irônico de Itaguaí."
    ]
  }
];
