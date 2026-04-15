# Módulo de Impressão

## Visão Geral

O sistema suporta dois destinos de impressão simultâneos:

| Destino | Tipo | Conexão | Conteúdo |
|---------|------|---------|----------|
| **Caixa** | Comprovante completo | USB (i9) | Itens, preços, total, data |
| **Cozinha** | Pedido simplificado | Rede TCP/IP | Itens, acompanhamentos, obs (sem preços) |

## Protocolo ESC/POS

Impressoras térmicas usam o protocolo ESC/POS (Epson Standard Code for Point of Sale). A biblioteca `python-escpos` implementa este protocolo.

## Modos de Operação

### 1. Modo Simulação (padrão)
- Não precisa de impressora física
- Gera arquivos `.txt` em `database/impressoes/`
- Ideal para desenvolvimento e testes
- Ativado por padrão na configuração

### 2. Modo USB (Caixa - i9)
- Conexão direta via USB
- Requer `vendor_id` e `product_id` da impressora
- Requer driver libusb no Windows

### 3. Modo Rede (Cozinha)
- Conexão TCP/IP
- Requer IP e porta (padrão 9100)
- Comum em impressoras de cozinha

## Layout - Comprovante do Caixa

```
==========================================
  RESTAURANTE SABOR & CIA
==========================================
  PEDIDO #001
  Data: 2026-04-15 12:30:45
==========================================

  Frango à Parmegiana
    Acomp: Purê de Batata
    Bebida: Pepsi Lata
    Sobremesa: Brigadeirão
    ** COMBO **
    R$ 44.90
------------------------------------------
  Picanha Grelhada
    Acomp: Arroz Branco
    R$ 52.90
------------------------------------------

  TOTAL: R$ 97.80

==========================================
  Obrigado pela preferência!
==========================================
```

## Layout - Pedido da Cozinha

```
==========================================
  *** COZINHA ***
  PEDIDO #001
  Hora: 2026-04-15 12:30:45
==========================================

  1. Frango à Parmegiana
     >> Purê de Batata
     >> Bebida: Pepsi Lata
     >> Sobremesa: Brigadeirão

  2. Picanha Grelhada
     >> Arroz Branco

==========================================
```

## Tratamento de Falhas

1. Se a impressora não responde: salva simulação em arquivo + mostra erro na tela
2. Se a biblioteca não está instalada: usa modo simulação automaticamente
3. Pedido é SEMPRE salvo no banco, independente do resultado da impressão
4. Flags `impresso_caixa` e `impresso_cozinha` rastreiam o estado
5. Reimpressão disponível a qualquer momento pela tela de Pedidos do Dia

## Configuração da Impressora i9 USB

### Descobrir Vendor/Product ID

**Windows:**
1. Conectar impressora USB
2. Abrir Gerenciador de Dispositivos
3. Encontrar a impressora
4. Propriedades > Detalhes > IDs de hardware
5. Anotar VID e PID (ex: VID_0483&PID_5743)

**Linux/Mac:**
```bash
lsusb
# Saída: Bus 001 Device 003: ID 0483:5743 ...
# Vendor: 0x0483, Product: 0x5743
```

### Configurar no sistema
1. Acessar menu Impressoras
2. Cadastrar impressora com tipo "caixa", conexão "usb"
3. Informar Vendor ID (ex: 0x0483) e Product ID (ex: 0x5743)
4. Desmarcar "Modo simulação" nas configurações gerais

## Configuração da Impressora de Rede (Cozinha)

1. Verificar IP da impressora na rede (painel da impressora ou DHCP do roteador)
2. Acessar menu Impressoras
3. Cadastrar impressora com tipo "cozinha", conexão "rede"
4. Informar IP (ex: 192.168.1.100) e porta (padrão: 9100)
5. Desmarcar "Modo simulação" nas configurações gerais

## Instalação de Drivers USB (Windows)

Para impressoras USB no Windows, é necessário o driver **Zadig** + **libusb**:

1. Baixar Zadig: https://zadig.akeo.ie/
2. Conectar a impressora USB
3. Abrir Zadig
4. Selecionar a impressora na lista
5. Selecionar "libusb-win32" como driver
6. Clicar "Replace Driver"
7. Reiniciar o computador
