const booksByNode = Object.freeze({
  "NODE-A": [
    {
      id: "TEC-001",
      titulo: "Clean Code",
      autor: "Robert C. Martin",
      categoria: "Tecnologia",
      origem: "NODE-A",
    },
    {
      id: "TEC-002",
      titulo: "Padrões de Arquitetura de Aplicações Corporativas",
      autor: "Martin Fowler",
      categoria: "Tecnologia",
      origem: "NODE-A",
    },
    {
      id: "TEC-003",
      titulo: "Sistemas Distribuídos",
      autor: "Maarten van Steen e Andrew S. Tanenbaum",
      categoria: "Tecnologia",
      origem: "NODE-A",
    },
    {
      id: "TEC-004",
      titulo: "Redes de Computadores",
      autor: "Andrew S. Tanenbaum",
      categoria: "Tecnologia",
      origem: "NODE-A",
    },
  ],
  "NODE-B": [
    {
      id: "LIT-001",
      titulo: "Dom Casmurro",
      autor: "Machado de Assis",
      categoria: "Literatura",
      origem: "NODE-B",
    },
    {
      id: "LIT-002",
      titulo: "O Cortiço",
      autor: "Aluísio Azevedo",
      categoria: "Literatura",
      origem: "NODE-B",
    },
    {
      id: "LIT-003",
      titulo: "A Hora da Estrela",
      autor: "Clarice Lispector",
      categoria: "Literatura",
      origem: "NODE-B",
    },
    {
      id: "LIT-004",
      titulo: "Capitães da Areia",
      autor: "Jorge Amado",
      categoria: "Literatura",
      origem: "NODE-B",
    },
  ],
});

export function getLocalBooks(nodeId) {
  return booksByNode[nodeId].map((book) => ({ ...book }));
}

