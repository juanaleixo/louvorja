export interface Contributors {
  name: string;
  description?: string;
  image?: string;

  email?: string;
  website?: string;
  github?: string;
  linkedin?: string;

  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  telegram?: string;
}

interface ContributorsCategory {
  name: string;
  contributors: Contributors[];
}

export const CONTRIBUTORS: ContributorsCategory[] = [
  {
    name: "Desenvolvedor da Coletânea",
    contributors: [
      {
        name: "Mayco W. G. Rolbuche",
        description: "Desenvolvedor da Coletânea",
        email: "mayco.rolbuche@yahoo.com.br",
        website: "https://maycorolbuche.com.br",
        facebook: "https://www.facebook.com/maycorolbuche",
      },
    ],
  },

  {
    name: "Patrocinadores",
    contributors: [
      {
        name: "Adalberto Correa",
        description: "Blog Liga o Som",
        email: "adalberto@correa.ac",
        website: "http://www.ligaosom.com.br/",
        facebook: "https://www.facebook.com/blogligaosom",
      },
      {
        name: "Ismael Lima",
        description: "Seven Informática",
        email: "ismael@seveninformatica.net.br",
        website: "http://seveninformatica.net.br/",
        facebook: "https://www.facebook.com/se7eninformatica",
      },
      {
        name: "Thiago Amaral de Oliveira",
        description: "Portal Adventista Baixo Guandu/ES",
        email: "thiagoamaraldeoliveira@gmail.com",
        website: "https://iasdbaixoguandu.com.br/",
        facebook: "https://www.facebook.com/thiagoguandu",
        // há também: https://esperancajovem.com.br/
      },
      {
        name: "Grupo Evangelístico 300 de Gideão",
        email: "grupoevangelistico300degideao@gmail.com",
        website: "https://300gideao.com.br/",
      },
    ],
  },

  {
    name: "Grupo Evangelístico",
    contributors: [],
  },

  {
    name: "Colaboradores",
    contributors: [
      {
        name: "Alexandre Oliveira Melo",
        email: "flanquista51bis@hotmail.com",
        facebook: "https://www.facebook.com/alexandre.oliveiradossantos.54",
      },
      {
        name: "Augusto Resende",
        email: "augusto.resende@outlook.com",
        facebook: "https://www.facebook.com/AugustoResendePublico",
      },
      {
        name: "Caique Marcel",
        email: "caiquemarceldbv@gmail.com",
      },
      {
        name: "Carlos Eduardo",
        email: "carlos.lol.lol.lol@gmail.com",
        facebook: "https://www.facebook.com/carlos.lol.lol.lol",
      },
      {
        name: "Edvaldo Cordeiro",
        email: "edvaldocostacordeiro@hotmail.com",
        facebook: "https://www.facebook.com/edvaldocostacordeiro",
      },
      {
        name: "Elcio Silva",
        email: "elciosilva.dbv@gmail.com",
        facebook: "https://www.facebook.com/elcio.silva.1422",
      },
      {
        name: "Eleandro Borel",
        facebook: "https://www.facebook.com/lele.kmi",
      },
      {
        name: "Gabriel Dutra Apolinário",
        email: "gabrieldutrqv@hotmail.com",
        facebook: "https://www.facebook.com/G2brielD2tra1",
      },
    ],
  },

  {
    name: "Outros Colaboradores",
    contributors: [
      {
        name: "Ido Rodrigues",
        email: "idorodrigues@hotmail.com",
        facebook: "https://facebook.com/ido.rodrigues",
      },
      {
        name: "Natanael Rodrigues",
        email: "natorso@hotmail.com",
        facebook: "https://facebook.com/natanael.srodrigues",
      },
      {
        name: "Neemias Lima",
        email: "neemiasml@gmail.com",
        website: "https://redeadventista.com/",
        facebook: "https://www.facebook.com/neemias.iasdc",
      },
      {
        name: "Rogerio Figueira",
        email: "roger.figueira31@gmail.com",
        facebook: "https://www.facebook.com/roger.figueira.14",
      },
      {
        name: "Tiago Lima",
        email: "tiagolimadbvs7@gmail.com",
        facebook: "https://www.facebook.com/tiago.nevesdelima",
      },
      {
        name: "Victor Hugo Ventura Rodrigues",
        email: "victor_hugo_ventura@hotmail.com",
        facebook: "https://www.facebook.com/victor.hugo.ventura",
      },
      {
        name: "Blog Daniel Gonçalves",
        description: "Áudio Escola Sabatina",
        website: "http://daniellocutor.com.br",
      },
    ],
  },
];
