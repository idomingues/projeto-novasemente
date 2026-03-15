-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: 127.0.0.1    Database: ns
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `acervo_items`
--

DROP TABLE IF EXISTS `acervo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `acervo_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(512) NOT NULL,
  `title` varchar(255) NOT NULL,
  `thumbnail_url` varchar(512) DEFAULT NULL,
  `video_count` int(10) unsigned DEFAULT NULL,
  `order` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acervo_items`
--

LOCK TABLES `acervo_items` WRITE;
/*!40000 ALTER TABLE `acervo_items` DISABLE KEYS */;
INSERT INTO `acervo_items` VALUES (1,'https://www.youtube.com/playlist?list=PL2kd2685Ul2mamHqiohIvUn7jcgyAmw-x','Playlist / Vídeo','https://i.ytimg.com/vi/aufEmXSXxFk/hqdefault.jpg',NULL,1,'2026-03-15 06:40:28','2026-03-15 06:40:28'),(2,'https://www.youtube.com/playlist?list=PL2kd2685Ul2kN1j9XDdKGU-2xnuiDYUha','Escolhidos - Ep.1 Para Permanecer | Pr. Igor Bolichoski I Nova Semente','https://i.ytimg.com/vi/14DjmuOugHI/hqdefault.jpg',NULL,2,'2026-03-15 06:43:04','2026-03-15 06:43:04'),(3,'https://www.youtube.com/playlist?list=PL2kd2685Ul2klMGDoNLKwnzo-Rtx_PQae','Encontros (In)esperados - Ep.13 O Retorno de Jesus I Pr. Igor Bolichoski I Nova Semente','https://i.ytimg.com/vi/_xdS6m6f2J8/hqdefault.jpg',NULL,3,'2026-03-15 06:44:02','2026-03-15 06:44:02'),(4,'https://www.youtube.com/playlist?list=PL2kd2685Ul2kWwhUGD9miI2mo-ikaZalT','A Escola do Deserto - Ep.12  Lição da Chegada  I Pr. Igor Bolichoski I Nova Semente','https://i.ytimg.com/vi/8166dNWoZzI/hqdefault.jpg',NULL,4,'2026-03-15 06:44:19','2026-03-15 06:44:19'),(5,'https://www.youtube.com/playlist?list=PL2kd2685Ul2kEDe01Ye019x0HolNv0JHx','Deus é Bom - Louvor Nova Semente','https://i.ytimg.com/vi/0Sd0PKsljlg/hqdefault.jpg',NULL,5,'2026-03-15 06:44:38','2026-03-15 06:44:38'),(6,'https://www.youtube.com/playlist?list=PL2kd2685Ul2nq0QmPSiIW-_w5L_0ekQT5','Espiritualmente Ep.6 - ALEGRIA  I Pr. Igor Bolichoski I Nova Semente','https://i.ytimg.com/vi/pufwyPNWcso/hqdefault.jpg',NULL,6,'2026-03-15 06:44:56','2026-03-15 06:44:56'),(7,'https://www.youtube.com/playlist?list=PL2kd2685Ul2kYqudBiC626odo3BOYBqKt','Ensaio do ministério de louvor Nova Semente | Deus De Promessas','https://i.ytimg.com/vi/AYfAnMt1tFM/hqdefault.jpg',NULL,7,'2026-03-15 06:45:30','2026-03-15 06:45:30'),(8,'https://www.youtube.com/playlist?list=PL2kd2685Ul2loOtLEAhv8ayVyVotHqxxC','Nova Semente | Metáforas - A Videira e os Ramos (1 de 4) - Pr. Igor Bolichoski','https://i.ytimg.com/vi/0EfEDZ5jJ2w/hqdefault.jpg',NULL,8,'2026-03-15 06:46:04','2026-03-15 06:46:04'),(9,'https://www.youtube.com/playlist?list=PL2kd2685Ul2k8_ih5toCPrvSzsP6UUr4z','Nova Semente | O Poder dos Fracos - A Pedagogia do Deserto (1 de 5) - Pr. Ricardo Nogarotto','https://i.ytimg.com/vi/B0TeHIYnsDw/hqdefault.jpg',NULL,9,'2026-03-15 06:46:21','2026-03-15 06:46:21'),(10,'https://www.youtube.com/playlist?list=PL2kd2685Ul2l2iBKGNNH12sv5h2v2zDf8','Nova Semente | Orações Perigosas - Usa-me (1 de 4) - Pr. Igor Bolichoski','https://i.ytimg.com/vi/w8wqTNGmneU/hqdefault.jpg',NULL,10,'2026-03-15 06:46:39','2026-03-15 06:46:39'),(11,'https://www.youtube.com/playlist?list=PL2kd2685Ul2nyDT8te5noOZZEZUalvEvY','Nova Semente | O Beijo da Morte - Paixão (1 de 5) - Pr. Igor Bolichoski','https://i.ytimg.com/vi/Y4FTNZ_-7_c/hqdefault.jpg',NULL,11,'2026-03-15 06:46:57','2026-03-15 06:46:57'),(12,'https://www.youtube.com/playlist?list=PL2kd2685Ul2lUOoPrYppbcINRqg9-FSsg','Nova Semente | O Salvador - O Caminho (1 de 4) - Pr. Igor Bolichoski','https://i.ytimg.com/vi/FqmiJdH2GmM/hqdefault.jpg',NULL,12,'2026-03-15 06:48:55','2026-03-15 06:48:55'),(13,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb0tfz7cNqNmHrdNGUoorne','A Era do Vazio | Homem X Animal 1 de 5 | Aqueldan Feldberg','https://i.ytimg.com/vi/GtG9JBPlIU0/hqdefault.jpg',NULL,13,'2026-03-15 06:50:27','2026-03-15 06:50:27'),(14,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbpwFFKvsKAOfo9yX73HPeU','Comunidade','https://i.ytimg.com/vi/BAPli5NZImk/hqdefault.jpg',NULL,14,'2026-03-15 07:00:18','2026-03-15 07:05:55'),(15,'https://www.youtube.com/playlist?list=PL_Egd78NnIAY9NAa3BN1WTSIx8hhW6dr_','Comunidade 2022','https://i.ytimg.com/vi/UCQlZkusBsM/hqdefault.jpg',NULL,15,'2026-03-15 07:00:18','2026-03-15 07:05:55'),(16,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaqJQcdEJCESy1DkJcZaxe3','Louvor e Banda Nova Semente','https://i.ytimg.com/vi/xE4X50PD4jc/hqdefault.jpg',NULL,16,'2026-03-15 07:00:18','2026-03-15 07:05:55'),(17,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZYynvfTKbmgQl7jQksn6Um','NS - Lugar Melhor DVD','https://i.ytimg.com/vi/g-vYv9azAKo/hqdefault.jpg',NULL,17,'2026-03-15 07:00:18','2026-03-15 07:05:55'),(18,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaYLOBACRsdFK6jd9aIszdf','Série - QUAL É O SEU NOME?','https://i.ytimg.com/vi/l55ZaH_ub2s/hqdefault.jpg',NULL,18,'2026-03-15 07:00:18','2026-03-15 07:05:56'),(19,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZDTVkvLymu3E4sfnJZUTU6','Série - ESTAÇÕES DA VIDA','https://i.ytimg.com/vi/T3pvjXjiGOs/hqdefault.jpg',NULL,19,'2026-03-15 07:00:18','2026-03-15 07:05:56'),(20,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZz8KVowwfA85YvLNTByZ-C','Série - SIMPLES ASSIM…','https://i.ytimg.com/vi/k-QB5X36DDs/hqdefault.jpg',NULL,20,'2026-03-15 07:00:19','2026-03-15 07:05:56'),(21,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZTSrzokEgwR5oBsLHUgTGO','Série - ENTRE A FÉ E A DÚVIDA','https://i.ytimg.com/vi/3fBYOx9qiPI/hqdefault.jpg',NULL,21,'2026-03-15 07:00:19','2026-03-15 07:05:56'),(22,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZqeajL_S1hF-opRMQPAXn2','O Santuário no tempo','https://i.ytimg.com/vi/npijjuPi9mE/hqdefault.jpg',NULL,22,'2026-03-15 07:00:19','2026-03-15 07:05:56'),(23,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbze6_K2-PByiSPqmctqS5b','Deserto','https://i.ytimg.com/vi/4MzXhqQa-qI/hqdefault.jpg',NULL,23,'2026-03-15 07:00:19','2026-03-15 07:05:56'),(24,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYQU5AjvV2M7F_KeFXkt-D5','Enviados','https://i.ytimg.com/vi/V8hJziEOth0/hqdefault.jpg',NULL,24,'2026-03-15 07:00:19','2026-03-15 07:05:56'),(25,'https://www.youtube.com/playlist?list=PL_Egd78NnIAa51HX5c5G8f7epNILcVle5','Ainda que morra','https://i.ytimg.com/vi/gho9iVKVETQ/hqdefault.jpg',NULL,25,'2026-03-15 07:00:19','2026-03-15 07:05:56'),(26,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaQY_sZhwy45ccuFxYp0o7X','Começos 2021','https://i.ytimg.com/vi/Qd7pKO887Aw/hqdefault.jpg',NULL,26,'2026-03-15 07:00:19','2026-03-15 07:05:57'),(27,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZPpZ3WqVtDHUyEcJ67CkmK','Série - NO PRINCÍPIO - Edson Nunes Jr','https://i.ytimg.com/vi/UppHXcxZG4U/hqdefault.jpg',NULL,27,'2026-03-15 07:00:19','2026-03-15 07:05:57'),(28,'https://www.youtube.com/playlist?list=PL_Egd78NnIAayG9Oml6mFHFeNkrFJP8qa','Re Pensando - No Princípio (Comentários)','https://i.ytimg.com/vi/ufc0FaOCbnU/hqdefault.jpg',NULL,28,'2026-03-15 07:00:19','2026-03-15 07:05:57'),(29,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYhweAEeOqyN82xlrO1GuqM','Princípio e Fim','https://i.ytimg.com/vi/eIUmg67uamo/hqdefault.jpg',NULL,29,'2026-03-15 07:00:19','2026-03-15 07:05:57'),(30,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ0aKxJUBe3Z51WrMrbrSIv','Alianças: de Gênesis ao Apocalipse','https://i.ytimg.com/vi/UppHXcxZG4U/hqdefault.jpg',NULL,30,'2026-03-15 07:00:19','2026-03-15 07:05:57'),(31,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbpOAj1V0yFo0mOThGeWrGz','Boas Novas','https://i.ytimg.com/vi/brG8BiIZ3ro/hqdefault.jpg',NULL,31,'2026-03-15 07:00:20','2026-03-15 07:05:57'),(32,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ2XgLKlx43c6F8mFtK-N_b','Olhos que Condenam','https://i.ytimg.com/vi/JOHwnmYVuhg/hqdefault.jpg',NULL,32,'2026-03-15 07:00:20','2026-03-15 07:05:57'),(33,'https://www.youtube.com/playlist?list=PL_Egd78NnIAY1d8N--3SfC-WYRauvM5z-','Edson Nunes Jr | O Verbo se fez carne - O Verbo de Deus 1 de 7','https://i.ytimg.com/vi/pMgerLkk0Nk/hqdefault.jpg',NULL,33,'2026-03-15 07:05:23','2026-03-15 07:05:23'),(34,'https://www.youtube.com/playlist?list=PL_Egd78NnIAayIDUOt8kaR8wLF48FlrWX','A hora da estrela','https://i.ytimg.com/vi/G1M3t73GzgI/hqdefault.jpg',NULL,34,'2026-03-15 07:05:51','2026-03-15 07:05:51'),(35,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZRfGPU9Tqa_PbySHmUupZ8','Conexão 2020','https://i.ytimg.com/vi/uWp5cBlhmjM/hqdefault.jpg',NULL,35,'2026-03-15 07:06:14','2026-03-15 07:06:14'),(36,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb8shnWoknYEa40luZxGK-z','Filho de Davi','https://i.ytimg.com/vi/LVITpZRAD_A/hqdefault.jpg',NULL,36,'2026-03-15 07:06:49','2026-03-15 07:06:49'),(37,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZNU00uNgIZtmBfhlNXV-Wh','Comunidade 2020','https://i.ytimg.com/vi/UppHXcxZG4U/hqdefault.jpg',NULL,37,'2026-03-15 07:07:03','2026-03-15 07:07:03'),(38,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZMppmYW7RF6BbTqc9b4Eri','NOVA ALIANÇA','https://i.ytimg.com/vi/Asqz1iVHnqw/hqdefault.jpg',NULL,38,'2026-03-15 07:07:17','2026-03-15 07:07:17'),(39,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZb3OJcYitLQCUlbMynBLSZ','Série - AMARELO','https://i.ytimg.com/vi/xRCdkG-62zQ/hqdefault.jpg',NULL,39,'2026-03-15 07:07:30','2026-03-15 07:07:30'),(40,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYL1ilFgJWfoopPLbaRlWoG','Série - NO MEIO DELES','https://i.ytimg.com/vi/DNyA2SbdVTE/hqdefault.jpg',NULL,40,'2026-03-15 07:07:40','2026-03-15 07:07:40'),(41,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZT6l1cI2HThs0f75pzOCMx','Série - SINAI','https://i.ytimg.com/vi/ECEmjLdiMxI/hqdefault.jpg',NULL,41,'2026-03-15 07:08:30','2026-03-15 07:08:30'),(42,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZCWgB78KlW-EwsSMEKKhn0','Série - ARQUÉTIPOS','https://i.ytimg.com/vi/FHp_VMoSxf4/hqdefault.jpg',NULL,42,'2026-03-15 07:09:27','2026-03-15 07:09:27'),(43,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbjCYo0xHHwsVd5CgA3b6fU','Série - REGRAS DE DEUS PARA A VIDA - Pr. Kleber Gonçalves','https://i.ytimg.com/vi/k6r8FWhPHlI/hqdefault.jpg',NULL,43,'2026-03-15 07:09:37','2026-03-15 07:09:37'),(44,'https://www.youtube.com/playlist?list=PL_Egd78NnIAayG9Oml6mFHFeNkrFJP8qa','RE PENSANDO - No Princípio (Comentários)','https://i.ytimg.com/vi/ufc0FaOCbnU/hqdefault.jpg',NULL,44,'2026-03-15 07:09:57','2026-03-15 07:09:57'),(45,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbL6WEDhzMShW7-3fvn2BUl','Reflexões diárias','https://i.ytimg.com/vi/6yAdHJAsNKA/hqdefault.jpg',NULL,45,'2026-03-15 07:10:07','2026-03-15 07:10:07'),(46,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZPpZ3WqVtDHUyEcJ67CkmK','Série - NO PRINCÍPIO - Edson Nunes Jr','https://i.ytimg.com/vi/UppHXcxZG4U/hqdefault.jpg',NULL,46,'2026-03-15 07:10:16','2026-03-15 07:10:16'),(47,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYvbVlsLU1AwxYudxtHAj3Q','Série - ATÉ A ÚLTIMA FLECHA - Pr. Kleber Gonçalves','https://i.ytimg.com/vi/e2yZrTFH6MQ/hqdefault.jpg',NULL,47,'2026-03-15 07:10:29','2026-03-15 07:10:29'),(49,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZEZlvK_ZvJRVvPJ4P7PW45','Série - 3 DESEJOS','https://i.ytimg.com/vi/XqrXiuSxhsE/hqdefault.jpg',NULL,48,'2026-03-15 07:11:48','2026-03-15 07:11:48'),(50,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbS2kdntTccLqFK7cJLeaVq','Série - RE- PENSANDO ESPIRITUALIDADE','https://i.ytimg.com/vi/IwkuBb9AQ9E/hqdefault.jpg',NULL,49,'2026-03-15 07:11:57','2026-03-15 07:11:57'),(51,'https://www.youtube.com/playlist?list=PL_Egd78NnIAadskfsayN_PU7SYwgTFSbw','Viva Celebration de Natal','https://i.ytimg.com/vi/PkZP406rNqg/hqdefault.jpg',NULL,50,'2026-03-15 07:12:10','2026-03-15 07:12:10'),(52,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbpHDreOdeyf8mBviCOiiyR','Série - CONVITES DE DEUS','https://i.ytimg.com/vi/wyGlXDvDFzE/hqdefault.jpg',NULL,51,'2026-03-15 07:12:22','2026-03-15 07:12:22'),(53,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYWcSngI2hNsJV841NKwe2y','Série - EXTRAORDINÁRIOS','https://i.ytimg.com/vi/gixijvzmZ5w/hqdefault.jpg',NULL,52,'2026-03-15 07:12:35','2026-03-15 07:12:35'),(54,'https://www.youtube.com/playlist?list=PL_Egd78NnIAatymNXlPDw14o5z7FoWNu2','Programação Especial','https://i.ytimg.com/vi/6olu0Jvptr0/hqdefault.jpg',NULL,53,'2026-03-15 07:13:07','2026-03-15 07:13:07'),(55,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ2W_ZgS2m_RtDFFtLDjg-F','Série - SOBREVIVENTES','https://i.ytimg.com/vi/SIz8GmuFiJ8/hqdefault.jpg',NULL,54,'2026-03-15 07:13:19','2026-03-15 07:13:19'),(56,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb7rjVfraIJCVmMUvjsdv1q','Série - TÓXICOS - Pr Andrey Masson','https://i.ytimg.com/vi/jfOcBhKgS6s/hqdefault.jpg',NULL,55,'2026-03-15 07:13:27','2026-03-15 07:13:27'),(57,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb4e3iLBTJc_kT4P4XNZfkJ','Série - PARÁBOLAS DE JESUS','https://i.ytimg.com/vi/qFR4dMadPzA/hqdefault.jpg',NULL,56,'2026-03-15 07:13:55','2026-03-15 07:13:55'),(58,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbHhIOoyRMoHapD1-5B4UZa','Série - HUMANOS','https://i.ytimg.com/vi/KHKIbp2vaQs/hqdefault.jpg',NULL,57,'2026-03-15 07:14:05','2026-03-15 07:14:05'),(59,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbTJ7iRHjhDPWVnholpK_-R','Série - À SOMBRA DO MEDO','https://i.ytimg.com/vi/pG8vY1zjguA/hqdefault.jpg',NULL,58,'2026-03-15 07:14:17','2026-03-15 07:14:17'),(60,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYSwZsAI5g85rqq1cudThvm','Série - SUPER NATURAL','https://i.ytimg.com/vi/gy0D_DSkqBg/hqdefault.jpg',NULL,59,'2026-03-15 07:14:24','2026-03-15 07:14:24'),(61,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaRkKWNU_Tcug-0ioaggxMZ','Série - O REINO CHEGOU','https://i.ytimg.com/vi/NCoaNARzCNs/hqdefault.jpg',NULL,60,'2026-03-15 07:14:34','2026-03-15 07:14:34'),(62,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZpjT1DK2ZErgnnDCOCE1sB','Série - SABER VIVER','https://i.ytimg.com/vi/Sl4LqNiXpL4/hqdefault.jpg',NULL,61,'2026-03-15 07:14:56','2026-03-15 07:14:56'),(63,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZC3_uTA2rKcaKH85EQe_Xh','Série - EXISTE AMOR EM SP - Pr Andrey Masson','https://i.ytimg.com/vi/S8NA1Y2MZ2c/hqdefault.jpg',NULL,62,'2026-03-15 07:15:04','2026-03-15 07:15:04'),(64,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaWW4I_rkSAWkkGnenVBmg4','Série - JUNTOS TODO DIA','https://i.ytimg.com/vi/cPBITytFVn4/hqdefault.jpg',NULL,63,'2026-03-15 07:15:16','2026-03-15 07:15:16'),(65,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaeD2NSwnY7KGP1pih6r_06','Série - O PÂO QUE O DIABO AMASSOU','https://i.ytimg.com/vi/vUg17JJvnRA/hqdefault.jpg',NULL,64,'2026-03-15 07:15:32','2026-03-15 07:15:32'),(66,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZxPyPPye8oijE2zMh3XI0p','Série - A PELE QUE HABITO','https://i.ytimg.com/vi/_VdRV4P244I/hqdefault.jpg',NULL,65,'2026-03-15 07:15:41','2026-03-15 07:15:41'),(67,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaGnrtirk-i9Oqblp_NhFI5','Série - ADORADORES','https://i.ytimg.com/vi/Oowg4Vsfv48/hqdefault.jpg',NULL,66,'2026-03-15 07:15:52','2026-03-15 07:15:52'),(68,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYPGvv6ch5votdySIxr5THx','Série - UM OUTRO JEITO DE USAR A BOCA','https://i.ytimg.com/vi/lSCUCZErUng/hqdefault.jpg',NULL,67,'2026-03-15 07:16:00','2026-03-15 07:16:00'),(69,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZF9F3SHbQKejXcQZB79ka_','Série - DIAS DE LUTA, DIAS DE GLÓRIA','https://i.ytimg.com/vi/CEYcjH5XU3s/hqdefault.jpg',NULL,68,'2026-03-15 07:16:11','2026-03-15 07:16:11'),(70,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZmYAp1QhyBhIEPb-nlkjLx','Série - AMOR AO CUBO','https://i.ytimg.com/vi/86Jo6GE6V5A/hqdefault.jpg',NULL,69,'2026-03-15 07:16:19','2026-03-15 07:16:19'),(71,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZfk0WZ_OpkvMd1oyIFlOR0','Série - JESUS É','https://i.ytimg.com/vi/X5BNuCCpa_4/hqdefault.jpg',NULL,70,'2026-03-15 07:16:28','2026-03-15 07:16:28'),(72,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb5i0F8_IR5YahhBJW8Weap','Série - VIDA LOKA','https://i.ytimg.com/vi/hnIgWBTavN8/hqdefault.jpg',NULL,71,'2026-03-15 07:16:37','2026-03-15 07:16:37'),(73,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb3CxfRD-HEqpSzJ8LRBMZQ','Série - ACONTECE NAS MELHORES FAMÍLIAS','https://i.ytimg.com/vi/O0yYYLUuWsM/hqdefault.jpg',NULL,72,'2026-03-15 07:16:45','2026-03-15 07:16:45'),(74,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbQ5N-pbASJwsAqiIc5P3mE','Série - PERDÃO','https://i.ytimg.com/vi/x-U9C3dFiuU/hqdefault.jpg',NULL,73,'2026-03-15 07:16:55','2026-03-15 07:16:55'),(75,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaVdgVNP4GkIpKpgKHNSZrv','Série - VULNERÁVEIS','https://i.ytimg.com/vi/y722LqW8fuI/hqdefault.jpg',NULL,74,'2026-03-15 07:17:02','2026-03-15 07:17:02'),(76,'https://www.youtube.com/playlist?list=PL_Egd78NnIAY5jOyxESmjsjAd6KNJjSHH','Série - SUBVERSIVOS','https://i.ytimg.com/vi/ATWdYM9o2gg/hqdefault.jpg',NULL,75,'2026-03-15 07:17:11','2026-03-15 07:17:11'),(77,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZPEkH-PNS68W5DxA0QkPsY','Série - ASSIM DIZ O SENHOR','https://i.ytimg.com/vi/dNQb9NBZua0/hqdefault.jpg',NULL,76,'2026-03-15 07:17:20','2026-03-15 07:17:20'),(78,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbquALApGsf6G7GXHHE_TKv','Série - O REINO','https://i.ytimg.com/vi/fSxalNp8Qh8/hqdefault.jpg',NULL,77,'2026-03-15 07:17:27','2026-03-15 07:17:27'),(79,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYe_YHLFqCBr6AddZktNv3I','Série - É O AMOR','https://i.ytimg.com/vi/aOk3X_W2FVY/hqdefault.jpg',NULL,78,'2026-03-15 07:18:21','2026-03-15 07:18:21'),(80,'https://www.youtube.com/playlist?list=PL_Egd78NnIAY_2aEU-hujWSBYbD63gXME','Série - MENSAGEM ESPECIAL','https://i.ytimg.com/vi/Jrfc_1luVO4/hqdefault.jpg',NULL,79,'2026-03-15 07:18:34','2026-03-15 07:18:34'),(81,'https://www.youtube.com/playlist?list=PL_Egd78NnIAalMDtmGrz0sZHxvCrEn6dv','Série - O PEQUENO PRÍNCIPE','https://i.ytimg.com/vi/FGBhRAqmOiY/hqdefault.jpg',NULL,80,'2026-03-15 07:18:42','2026-03-15 07:18:42'),(82,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZTImKvGP7tGhuFvYu0lXzk','Série - UM SIMPLES OLHAR','https://i.ytimg.com/vi/VDGYY7pu9Zk/hqdefault.jpg',NULL,81,'2026-03-15 07:18:50','2026-03-15 07:18:50'),(83,'https://www.youtube.com/playlist?list=PL_Egd78NnIAY4FqA8vVhREkqgXN851D3w','Série - GUERRA DE TRONOS','https://i.ytimg.com/vi/kZOcVtzSP2M/hqdefault.jpg',NULL,82,'2026-03-15 07:18:59','2026-03-15 07:18:59'),(84,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZSFdwwb6Hl1LHSpF-Dxr9g','Série - O MAIOR DISCURSO DE CRISTO','https://i.ytimg.com/vi/9i-dpMc6n0Q/hqdefault.jpg',NULL,83,'2026-03-15 07:19:57','2026-03-15 07:19:57'),(85,'https://www.youtube.com/playlist?list=PL_Egd78NnIAY_ccaiRVBL69ONQ9keqEmj','Série - ANATOMIA DA DESTRUIÇÃO','https://i.ytimg.com/vi/wsIlfazKoJs/hqdefault.jpg',NULL,84,'2026-03-15 07:20:06','2026-03-15 07:20:06'),(86,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYiEkox7yqvgq_hvpnar7jr','Série - SER OU NÃO SER','https://i.ytimg.com/vi/9pF1K6FO4OA/hqdefault.jpg',NULL,85,'2026-03-15 07:20:14','2026-03-15 07:20:14'),(87,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYywrO4Hv1ympKAfMpQ2-AQ','Série - RECONCILIADOS','https://i.ytimg.com/vi/QD42_i2mYII/hqdefault.jpg',NULL,86,'2026-03-15 07:20:23','2026-03-15 07:20:23'),(88,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYz75beqFEg0domUl1f0jNz','Série - SOBRENATURAL','https://i.ytimg.com/vi/v8-iDLDm_Mk/hqdefault.jpg',NULL,87,'2026-03-15 07:20:45','2026-03-15 07:20:45'),(89,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbvyxN8mDa4MvEyQNJ98hAX','Série - MAIS','https://i.ytimg.com/vi/xxEBF_KBeGY/hqdefault.jpg',NULL,88,'2026-03-15 07:20:55','2026-03-15 07:20:55'),(90,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbrHrvGJpz87xnVieFbSAhs','Série - METAMORFOSE','https://i.ytimg.com/vi/R0f6Bf6lkPk/hqdefault.jpg',NULL,89,'2026-03-15 07:21:02','2026-03-15 07:21:02'),(91,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYrpQJXgd8CqjYG28ppR-EK','Série - CONVITE À ALEGRIA','https://i.ytimg.com/vi/A-FDOtgGHRk/hqdefault.jpg',NULL,90,'2026-03-15 07:21:11','2026-03-15 07:21:11'),(92,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbKg2iaUZVvWvbrlfUnqhvx','Série - MEDO','https://i.ytimg.com/vi/Nl3zy8COw84/hqdefault.jpg',NULL,91,'2026-03-15 07:21:18','2026-03-15 07:21:18'),(93,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbKg2iaUZVvWvbrlfUnqhvx','Série - MEDO','https://i.ytimg.com/vi/Nl3zy8COw84/hqdefault.jpg',NULL,92,'2026-03-15 07:21:30','2026-03-15 07:21:30'),(94,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaH85etXqRDxBilTrKbLEOg','Série - DISCÍPULO RADICAL','https://i.ytimg.com/vi/uEMIE7Ab_a0/hqdefault.jpg',NULL,93,'2026-03-15 07:21:40','2026-03-15 07:21:40'),(95,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYS6X9UDdsGr-lQuySHG4ve','Série - NA MEDIDA CERTA','https://i.ytimg.com/vi/UcM7HKOGuIo/hqdefault.jpg',NULL,94,'2026-03-15 07:21:48','2026-03-15 07:21:48'),(96,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYJpuMgNMMvLicIYJcrK23B','Série - EU SEI QUE VOU TE AMAR','https://i.ytimg.com/vi/QhFyP1bbDmw/hqdefault.jpg',NULL,95,'2026-03-15 07:21:55','2026-03-15 07:21:55'),(97,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbGzpVP2RTCz5dLroE1um99','Série - X, Y, Z...','https://i.ytimg.com/vi/mhfiyJZq658/hqdefault.jpg',NULL,96,'2026-03-15 07:22:03','2026-03-15 07:22:03'),(98,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZkJl4WA73xrGB_Bv2vD7fU','Série - REERGUENDO PILARES','https://i.ytimg.com/vi/m6dSogUjuCo/hqdefault.jpg',NULL,97,'2026-03-15 07:22:15','2026-03-15 07:22:15'),(99,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbW_5dcymaba1ATu5iaUa9H','Série - QUANDO DEUS NÃO FAZ SENTIDO','https://i.ytimg.com/vi/HXnN1xROzwg/hqdefault.jpg',NULL,98,'2026-03-15 07:23:47','2026-03-15 07:23:47'),(100,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbXg2iGgGqkaR_P0QRm0ZEe','Série - PAUSE','https://i.ytimg.com/vi/bWa1LespK6I/hqdefault.jpg',NULL,99,'2026-03-15 07:23:58','2026-03-15 07:23:58'),(101,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZms1cUiPXlM1h7q8pUBX2s','Série - DE SEGUNDA A SEGUNDA','https://i.ytimg.com/vi/oEA3zcptfdA/hqdefault.jpg',NULL,100,'2026-03-15 07:24:07','2026-03-15 07:24:07'),(102,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaJxwx9p8yvUHVuEeuiRV6c','COMEÇOS 2017','https://i.ytimg.com/vi/nOk_7hmaDhI/hqdefault.jpg',NULL,101,'2026-03-15 07:24:15','2026-03-15 07:24:15'),(103,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZtQOCBGoaVqbEyy2lwLatD','Série - COM ELES E POR ELES','https://i.ytimg.com/vi/UNtlGpEBtFk/hqdefault.jpg',NULL,102,'2026-03-15 07:24:22','2026-03-15 07:24:22'),(104,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYuhDOeYrj_dQfnzHFfWn42','Série - 6 MENTIRAS E VERDADES','https://i.ytimg.com/vi/yIB5PoxJu40/hqdefault.jpg',NULL,103,'2026-03-15 07:24:41','2026-03-15 07:24:41'),(105,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaWjRQmREQj4WiHuYYucE5n','Série - JORNADA DA VIDA 2017','https://i.ytimg.com/vi/XE4IEYIjdGU/hqdefault.jpg',NULL,104,'2026-03-15 07:25:13','2026-03-15 07:25:13'),(106,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb2bIMXWdEpWf4MCpCGtYCe','Série - IMPOSSÍVEL PARA QUEM?','https://i.ytimg.com/vi/L3A3zXov6KE/hqdefault.jpg',NULL,105,'2026-03-15 07:25:43','2026-03-15 07:25:43'),(107,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYq5_2v-FKfkC6R3RQkG1Yt','Série - OS 7 PECADOS','https://i.ytimg.com/vi/gBemNvfJ7ig/hqdefault.jpg',NULL,106,'2026-03-15 07:25:53','2026-03-15 07:25:53'),(108,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbyWLj0UEqNyyX0iPCpE834','Série - COMER, REZAR, AMAR','https://i.ytimg.com/vi/KB0z9PEGfZw/hqdefault.jpg',NULL,107,'2026-03-15 07:26:11','2026-03-15 07:26:11'),(109,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYcBKoxtoufrpY5UZBBsEE7','Série - QUATRO FACES DE CRISTO','https://i.ytimg.com/vi/reEKnSdM9uk/hqdefault.jpg',NULL,108,'2026-03-15 07:26:27','2026-03-15 07:26:27'),(110,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZsLJIngWKtAnUqEOrgbwU9','Série - Aliviando A Bagagem','https://i.ytimg.com/vi/pcxswwhIhe4/hqdefault.jpg',NULL,109,'2026-03-15 07:26:35','2026-03-15 07:26:35'),(111,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaqF9_HrTnXI_ALzhBgetOv','Série - HISTÓRIAS DA CRUZ DE CRISTO','https://i.ytimg.com/vi/0Z2FxJe_VaI/hqdefault.jpg',NULL,110,'2026-03-15 07:26:42','2026-03-15 07:26:42'),(112,'https://www.youtube.com/playlist?list=PL_Egd78NnIAY39ZCjAciJV1t8WGMYy3YC','Serie - TRANSCENDENTES','https://i.ytimg.com/vi/Smzd4wLXvz0/hqdefault.jpg',NULL,111,'2026-03-15 07:26:50','2026-03-15 07:26:50'),(113,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYIog-9l6jwsvxFTENP2aHq','Série - HERÓI','https://i.ytimg.com/vi/VDRFj_JRNUw/hqdefault.jpg',NULL,112,'2026-03-15 07:27:01','2026-03-15 07:27:01'),(114,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZbXUJ4SJyZhblWu4QQUWR_','Série - 24 HORAS','https://i.ytimg.com/vi/QmJ92NFkWKs/hqdefault.jpg',NULL,113,'2026-03-15 07:27:07','2026-03-15 07:27:07'),(115,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaZk7BlEfxpA_qr0XscR9l8','Série - O MELHOR DA VIDA','https://i.ytimg.com/vi/_4CzaaYJGwo/hqdefault.jpg',NULL,114,'2026-03-15 07:27:15','2026-03-15 07:27:15'),(116,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYHRv7dR94sXTPx7Y_PHVp8','Série - A ARTE DA GUERRA','https://i.ytimg.com/vi/UcwmgNVbXgk/hqdefault.jpg',NULL,115,'2026-03-15 07:27:24','2026-03-15 07:27:24'),(117,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbqrCVij8YBKV73m0ywJwFU','Série - SETE CARTAS','https://i.ytimg.com/vi/L0Sl1L2z1qo/hqdefault.jpg',NULL,116,'2026-03-15 07:27:32','2026-03-15 07:27:32'),(118,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbBk6NfAd0-q8ZgUtWUlvRv','Série - UM NOME PARA ENTRAR NA HISTÓRIA','https://i.ytimg.com/vi/YX1rm5efhD0/hqdefault.jpg',NULL,117,'2026-03-15 07:27:49','2026-03-15 07:27:49'),(119,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaljFFmLOH1HA_dTDt6wvII','Série - O APRENDIZ','https://i.ytimg.com/vi/5ILbxFELBV8/hqdefault.jpg',NULL,118,'2026-03-15 07:28:02','2026-03-15 07:28:02'),(120,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYpJoK7CTgONi6vh43kCHpY','Série - APENAS ACREDITE','https://i.ytimg.com/vi/Q4nru2YSF_4/hqdefault.jpg',NULL,119,'2026-03-15 07:28:10','2026-03-15 07:28:10'),(121,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZKnyxYZOE00luQNMam1ibO','Série - ANSIEDADE, PRA QUE?','https://i.ytimg.com/vi/kgcmWwC9XRE/hqdefault.jpg',NULL,120,'2026-03-15 07:28:17','2026-03-15 07:28:17'),(122,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZGY3ilXzFUTOrnfqwo4Qot','Série - A JORNADA DA VIDA','https://i.ytimg.com/vi/U5eqlB97P-0/hqdefault.jpg',NULL,121,'2026-03-15 07:28:24','2026-03-15 07:28:24'),(123,'https://www.youtube.com/playlist?list=PL_Egd78NnIAahFnkDog3v8XvnI5bDSLvn','Série - AMAR É...','https://i.ytimg.com/vi/nWsGnfmx8IA/hqdefault.jpg',NULL,122,'2026-03-15 07:28:44','2026-03-15 07:28:44'),(124,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbhD8wRnGFZHDPlyc6Fy2pE','Série - BOM DE MAIS PRA NÃO SER VERDADE','https://i.ytimg.com/vi/3BMMSPPlun0/hqdefault.jpg',NULL,123,'2026-03-15 07:28:53','2026-03-15 07:28:53'),(125,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbuq3wrQLF5F3iuYyWkv6wa','Série - O LIBERTADOR','https://i.ytimg.com/vi/p6geSCZU7i8/hqdefault.jpg',NULL,124,'2026-03-15 07:29:02','2026-03-15 07:29:02'),(126,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZvQf_vmceYjW12GRRvgdw7','Série - SOMOS UM','https://i.ytimg.com/vi/xqiG11s3pk0/hqdefault.jpg',NULL,125,'2026-03-15 07:29:08','2026-03-15 07:29:08'),(127,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbU_m5AGhLSr8yYKp26Un39','Série - O PROJETO','https://i.ytimg.com/vi/3goTixwKbyg/hqdefault.jpg',NULL,126,'2026-03-15 07:29:16','2026-03-15 07:29:16'),(128,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYRTvntyLE9Hawt9eaKpXfr','Série - IDENTIDADE DIVINA','https://i.ytimg.com/vi/ZTwR2pf7Mxo/hqdefault.jpg',NULL,127,'2026-03-15 07:29:30','2026-03-15 07:29:30'),(129,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYg30mALCi9HkMfszy3Q2jZ','Série - CHECK-UP','https://i.ytimg.com/vi/9WWPRamuuUs/hqdefault.jpg',NULL,128,'2026-03-15 07:29:37','2026-03-15 07:29:37'),(130,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbHWfkgMD_Xrcz_1CdHbPYn','Série - 10 ANOS','https://i.ytimg.com/vi/zWny_Sun7lM/hqdefault.jpg',NULL,129,'2026-03-15 07:29:45','2026-03-15 07:29:45'),(131,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbMRFYcQSh0XXbtWo9FlxqP','Série - POR VOCÊ','https://i.ytimg.com/vi/PSvdu0G91rM/hqdefault.jpg',NULL,130,'2026-03-15 07:29:53','2026-03-15 07:29:53'),(132,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbRky6Ly_4Bg_95zTtclOV0','Série - FELICIDADE SEM FIM','https://i.ytimg.com/vi/T6CWArM87Y4/hqdefault.jpg',NULL,131,'2026-03-15 07:30:00','2026-03-15 07:30:00'),(133,'https://www.youtube.com/playlist?list=PL_Egd78NnIAa68yJ8M9qkvlFci2caoGyS','LINK','https://i.ytimg.com/vi/T2I_1xmGPTg/hqdefault.jpg',NULL,132,'2026-03-15 07:30:22','2026-03-15 07:30:22'),(134,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb0PXlAAGb9OUDY9KO--xbz','Série - ENTREVISTA COM DEUS','https://i.ytimg.com/vi/pgQJivj1XGw/hqdefault.jpg',NULL,133,'2026-03-15 07:30:29','2026-03-15 07:30:29'),(135,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ3o-s4qG2g-XghJnR91snb','Série - NOS JARDINS DA BABILÔNIA','https://i.ytimg.com/vi/Fi4lqEYyxtY/hqdefault.jpg',NULL,134,'2026-03-15 07:30:36','2026-03-15 07:30:36'),(136,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbEyuqy8Bvup83ZwPBjdsqn','Série - A GRANDE VIRADA','https://i.ytimg.com/vi/mjLgRIVW1vA/hqdefault.jpg',NULL,135,'2026-03-15 07:30:44','2026-03-15 07:30:44'),(137,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbO2iEae4cXqztNCxQ0Mrwj','Série - LEGADOS','https://i.ytimg.com/vi/QzKEBNM7F1E/hqdefault.jpg',NULL,136,'2026-03-15 07:30:51','2026-03-15 07:30:51'),(138,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZHzd8U9itY_vgf4Dv6d08j','Série - A CASA DA ROCHA','https://i.ytimg.com/vi/ufMFCbursSU/hqdefault.jpg',NULL,137,'2026-03-15 07:31:03','2026-03-15 07:31:03'),(139,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaUMhFdoOG91IYHe7rNHlCK','Série - INABALÁVEL','https://i.ytimg.com/vi/rAmrqH_QPNU/hqdefault.jpg',NULL,138,'2026-03-15 07:31:11','2026-03-15 07:31:11'),(140,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbbHAmt5JVnvKRSdkDxd1oO','Série - O PROPÓSITO DA VIDA','https://i.ytimg.com/vi/Uoy5eW_n35E/hqdefault.jpg',NULL,139,'2026-03-15 07:31:20','2026-03-15 07:31:20'),(141,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZsv5BXbUOdjrIiYa3s5eJa','Série - DESAPONTADOS COM DEUS','https://i.ytimg.com/vi/JH-8K4aga3A/hqdefault.jpg',NULL,140,'2026-03-15 07:31:28','2026-03-15 07:31:28'),(142,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZEbbLQZyeb0ILfL-BZ3y_x','Série - VENHA O TEU REINO','https://i.ytimg.com/vi/T0hFeuoDUb0/hqdefault.jpg',NULL,141,'2026-03-15 07:31:41','2026-03-15 07:31:41'),(143,'https://www.youtube.com/playlist?list=PL_Egd78NnIAahPoKFUamY-Bv3ZbDniOxo','Série - RECOMEÇOS','https://i.ytimg.com/vi/PFHHoSvevJ4/hqdefault.jpg',NULL,142,'2026-03-15 07:31:55','2026-03-15 07:31:55'),(144,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbSZxVnIJcvW--uCX4Ei_No','Série - APPS PARA A VIDA','https://i.ytimg.com/vi/Xa58Q1ncq9c/hqdefault.jpg',NULL,143,'2026-03-15 07:32:02','2026-03-15 07:32:02'),(145,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbkYhLBsBoLc53tM3ORQs97','Série - A SOMA DE TUDO','https://i.ytimg.com/vi/F1pfKmRUoFg/hqdefault.jpg',NULL,144,'2026-03-15 07:32:28','2026-03-15 07:32:28'),(146,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYJ3BsNzeZIRzFI01f1T8yL','Série - UMA VIDA COM PROPÓSITO','https://i.ytimg.com/vi/U5XjB2uPLgo/hqdefault.jpg',NULL,145,'2026-03-15 07:32:57','2026-03-15 07:32:57'),(147,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbIO-IsBLPdtxkA1uKnjjR3','Série - GUERRA DOS SEXOS','https://i.ytimg.com/vi/w02lCM5g2pA/hqdefault.jpg',NULL,146,'2026-03-15 07:33:06','2026-03-15 07:33:06'),(148,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYyPm10N9GCp-v5xU9qewg3','Série - PARE E OUÇA','https://i.ytimg.com/vi/8Gkn1U1kOjY/hqdefault.jpg',NULL,147,'2026-03-15 07:33:13','2026-03-15 07:33:13'),(149,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbKFepHbtC5h7c3rkknmzf-','Série - QUANDO VOCÊ PRECISA DE UM MILAGRE','https://i.ytimg.com/vi/KOQnEur9AwU/hqdefault.jpg',NULL,148,'2026-03-15 07:33:20','2026-03-15 07:33:20'),(150,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaeQxx5Fl_TpgoH52no4seG','Série - 2012','https://i.ytimg.com/vi/ur2D8bfX-OY/hqdefault.jpg',NULL,149,'2026-03-15 07:33:28','2026-03-15 07:33:28'),(151,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbdC8Seh1kpptxB3gxIYDVK','Série - PATER HEMON','https://i.ytimg.com/vi/2n04UclkgVA/hqdefault.jpg',NULL,150,'2026-03-15 07:35:46','2026-03-15 07:33:45'),(152,'https://www.youtube.com/playlist?list=PL_Egd78NnIAatlNJsS4g2jxHT73u5I5Cc','Série - VIVA SEM MEDO','https://i.ytimg.com/vi/NRzepQmu-3A/hqdefault.jpg',NULL,151,'2026-03-15 07:35:39','2026-03-15 07:34:16'),(153,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbsk-0vD1OAiJeD-izSnytQ','Serie - LIBERDADE','https://i.ytimg.com/vi/B_tZCMYYdko/hqdefault.jpg',NULL,152,'2026-03-15 07:35:27','2026-03-15 07:34:24'),(154,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYlHEjT2WId2oBZS-bMbCBo','Serie - E AGORA?','https://i.ytimg.com/vi/z0EPpdHb_2s/hqdefault.jpg',NULL,153,'2026-03-15 07:35:20','2026-03-15 07:34:43'),(155,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZltduy2MwqCSNRuoEH2f57','Série - O SEGREDO DE DEUS','https://i.ytimg.com/vi/ogiT9RF35jo/hqdefault.jpg',NULL,154,'2026-03-15 07:35:12','2026-03-15 07:34:55'),(156,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaEYC3PAdMeaxZU7P36rFQ2','Série - LIMITES','https://i.ytimg.com/vi/kJnHTASwuqw/hqdefault.jpg',NULL,155,'2026-03-15 07:35:04','2026-03-15 07:35:04'),(157,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZt-ppPj7If-zYD9avUJQhP','Série - PRINCÍPIOS','https://i.ytimg.com/vi/PP0xaBrdrHg/hqdefault.jpg',NULL,156,'2026-03-15 07:33:45','2026-03-15 07:35:12'),(158,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaXJXMoKUpOJNGGNMqerQ_v','Vídeos Promocionais','https://i.ytimg.com/vi/Y7Lcso9aZeQ/hqdefault.jpg',NULL,157,'2026-03-15 07:34:16','2026-03-15 07:35:20'),(159,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYDiypEQ0nuqnViDXzUx3kB','Série - TUDO POR AMOR','https://i.ytimg.com/vi/PBRmKqw3yt0/hqdefault.jpg',NULL,158,'2026-03-15 07:34:55','2026-03-15 07:35:27'),(160,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaykWqCwUuGOKpEFEQ3ptXm','Série - VIDAS OPOSTAS','https://i.ytimg.com/vi/DVAltwVUXjc/hqdefault.jpg',NULL,159,'2026-03-15 07:34:43','2026-03-15 07:35:39'),(161,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZbw3n_b54NzLFzPGtIhfRX','Serie - VENCEDORES','https://i.ytimg.com/vi/eV2ZGd1lLQ0/hqdefault.jpg',NULL,160,'2026-03-15 07:34:24','2026-03-15 07:35:46'),(162,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZDx1dq5fxUCbQA-2azbV4r','Série - EM OBRAS','https://i.ytimg.com/vi/n2ugc-cqfZw/hqdefault.jpg',NULL,161,'2026-03-15 07:36:28','2026-03-15 07:35:53'),(163,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ7C6TPmNdQdX3XtxfTZCuG','Série - DEZ RAZÕES PARA AMAR','https://i.ytimg.com/vi/o3exqLautH8/hqdefault.jpg',NULL,162,'2026-03-15 07:36:36','2026-03-15 07:36:00'),(164,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZAc-dpqwUI3wNFBQRsZavv','Série - ENCONTRANDO DEUS NA CABANA','https://i.ytimg.com/vi/p4FcvmwMmqQ/hqdefault.jpg',NULL,163,'2026-03-15 07:36:21','2026-03-15 07:36:10'),(165,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbqGmc_7zLKdQpIAIzQOARE','Série - VIVA MELHOR','https://i.ytimg.com/vi/nxIoT1Sv6u8/hqdefault.jpg',NULL,164,'2026-03-15 07:36:10','2026-03-15 07:36:21'),(166,'https://www.youtube.com/playlist?list=PL_Egd78NnIAbnahNDyiwqt5CW_CpAhp7j','Série - MORTE E VIDA','https://i.ytimg.com/vi/aX4ULropFjQ/hqdefault.jpg',NULL,165,'2026-03-15 07:36:00','2026-03-15 07:36:28'),(167,'https://www.youtube.com/playlist?list=PL_Egd78NnIAamjrYu3Z2PdzbgN9PBK2DM','Série - O MAIOR PRESENTE DE TODOS','https://i.ytimg.com/vi/gNb6dZF7rhk/hqdefault.jpg',NULL,166,'2026-03-15 07:35:53','2026-03-15 07:36:36'),(168,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZwavXUVj-5ST02U2I_s-C_','Série - GRATOS','https://i.ytimg.com/vi/gThfK3MWO34/hqdefault.jpg',NULL,167,'2026-03-15 07:36:43','2026-03-15 07:36:43'),(169,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZVIJXRqixbOBpyF48EE8II','Série - ATIVIDADES PARANORMAIS','https://i.ytimg.com/vi/2EoYMrPQdS0/hqdefault.jpg',NULL,168,'2026-03-15 07:36:51','2026-03-15 07:36:51'),(170,'https://www.youtube.com/playlist?list=PL_Egd78NnIAb2jJF2gHprDxRQflwrYQU6','Série - NA CONTRAMÃO DO MUNDO','https://i.ytimg.com/vi/gH0mFHl3xOs/hqdefault.jpg',NULL,169,'2026-03-15 07:37:05','2026-03-15 07:37:05'),(171,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZHV8Cw7cHlHfslCqnWgRZo','Série - CANÇÕES DA VIDA','https://i.ytimg.com/vi/QPM0AqcjL2s/hqdefault.jpg',NULL,170,'2026-03-15 07:37:13','2026-03-15 07:37:13'),(172,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZjwbvh9fjLR31wMmUX2Ja_','Série - DES...CONTAMINADOS','https://i.ytimg.com/vi/oZQp4ok-r9I/hqdefault.jpg',NULL,171,'2026-03-15 07:37:23','2026-03-15 07:37:23'),(173,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZqPavI2P-EqsYW_aXw8TDW','Série - O CAMINHO DA PLENITUDE','https://i.ytimg.com/vi/mh98Jn5irxc/hqdefault.jpg',NULL,172,'2026-03-15 07:37:31','2026-03-15 07:37:31'),(174,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ6St7YRBM8ISaAfrmp-YeQ','Série - VERDADES PARA O TEMPO DO FIM','https://i.ytimg.com/vi/6dNIdrMLbL4/hqdefault.jpg',NULL,173,'2026-03-15 07:37:40','2026-03-15 07:37:40'),(175,'https://www.youtube.com/playlist?list=PL_Egd78NnIAaK86nHc7iApcWLGV6LZOw4','Série - O JOGO DA VIDA','https://i.ytimg.com/vi/nPKvAg3dYkY/hqdefault.jpg',NULL,174,'2026-03-15 07:37:58','2026-03-15 07:37:58'),(176,'https://www.youtube.com/playlist?list=PL_Egd78NnIAYy8NOfnYse4cw3sDOWfoBi','Série - CRISTO','https://i.ytimg.com/vi/0VVI30YcG_k/hqdefault.jpg',NULL,175,'2026-03-15 07:38:08','2026-03-15 07:38:08'),(177,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZZJsbdGNJBn6GQSIDaeiqq','Série - ENCONTROS','https://i.ytimg.com/vi/cPZsYABT-xI/hqdefault.jpg',NULL,176,'2026-03-15 07:38:17','2026-03-15 07:38:17'),(178,'https://www.youtube.com/playlist?list=PL_Egd78NnIAazPPfNZ1a3nPb2XC1njfo0','Série - FELIZES PARA SEMPRE','https://i.ytimg.com/vi/BurVjDHgg-o/hqdefault.jpg',NULL,177,'2026-03-15 07:38:26','2026-03-15 07:38:26'),(179,'https://www.youtube.com/playlist?list=PL_Egd78NnIAauS2S7PkkqUwdodCS0YXTh','Série - O AMOR FALA MAIS ALTO','https://i.ytimg.com/vi/QwrIVK7fv7A/hqdefault.jpg',NULL,178,'2026-03-15 07:38:48','2026-03-15 07:38:48'),(180,'https://www.youtube.com/playlist?list=PL_Egd78NnIAZFq_-dUbI_XQZa1pAx6lEe','Série - A CAIXA PRETA DE DARWIN','https://i.ytimg.com/vi/rzY122MNf9A/hqdefault.jpg',NULL,179,'2026-03-15 07:38:59','2026-03-15 07:38:59');
/*!40000 ALTER TABLE `acervo_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
INSERT INTO `cache` VALUES ('laravel-cache-spatie.permission.cache','a:3:{s:5:\"alias\";a:4:{s:1:\"a\";s:2:\"id\";s:1:\"b\";s:4:\"name\";s:1:\"c\";s:10:\"guard_name\";s:1:\"r\";s:5:\"roles\";}s:11:\"permissions\";a:23:{i:0;a:4:{s:1:\"a\";i:1;s:1:\"b\";s:12:\"members.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:5;i:4;i:6;}}i:1;a:4:{s:1:\"a\";i:2;s:1:\"b\";s:14:\"members.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:2;a:4:{s:1:\"a\";i:3;s:1:\"b\";s:15:\"volunteers.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:5;i:4;i:6;}}i:3;a:4:{s:1:\"a\";i:4;s:1:\"b\";s:17:\"volunteers.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:4;a:4:{s:1:\"a\";i:5;s:1:\"b\";s:10:\"rooms.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:5;i:4;i:6;}}i:5;a:4:{s:1:\"a\";i:6;s:1:\"b\";s:12:\"rooms.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:6;a:4:{s:1:\"a\";i:7;s:1:\"b\";s:12:\"finance.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:4:{i:0;i:1;i:1;i:3;i:2;i:4;i:3;i:6;}}i:7;a:4:{s:1:\"a\";i:8;s:1:\"b\";s:14:\"finance.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:4;i:2;i:6;}}i:8;a:4:{s:1:\"a\";i:9;s:1:\"b\";s:12:\"escalas.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:5;i:4;i:6;}}i:9;a:4:{s:1:\"a\";i:10;s:1:\"b\";s:14:\"escalas.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:4:{i:0;i:1;i:1;i:2;i:2;i:5;i:3;i:6;}}i:10;a:4:{s:1:\"a\";i:11;s:1:\"b\";s:16:\"departments.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:5;i:4;i:6;}}i:11;a:4:{s:1:\"a\";i:12;s:1:\"b\";s:18:\"departments.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:12;a:4:{s:1:\"a\";i:13;s:1:\"b\";s:14:\"inventory.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:5;i:4;i:6;}}i:13;a:4:{s:1:\"a\";i:14;s:1:\"b\";s:16:\"inventory.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:14;a:4:{s:1:\"a\";i:15;s:1:\"b\";s:10:\"users.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:15;a:4:{s:1:\"a\";i:16;s:1:\"b\";s:12:\"users.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:16;a:4:{s:1:\"a\";i:17;s:1:\"b\";s:15:\"churches.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:2:{i:0;i:1;i:1;i:6;}}i:17;a:4:{s:1:\"a\";i:18;s:1:\"b\";s:9:\"news.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:5:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:5;i:4;i:6;}}i:18;a:4:{s:1:\"a\";i:19;s:1:\"b\";s:11:\"news.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:3:{i:0;i:1;i:1;i:2;i:2;i:6;}}i:19;a:4:{s:1:\"a\";i:20;s:1:\"b\";s:11:\"events.view\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:6:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:4;i:4;i:5;i:5;i:6;}}i:20;a:4:{s:1:\"a\";i:21;s:1:\"b\";s:13:\"events.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:4:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:6;}}i:21;a:4:{s:1:\"a\";i:22;s:1:\"b\";s:12:\"roles.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:2:{i:0;i:1;i:1;i:6;}}i:22;a:4:{s:1:\"a\";i:23;s:1:\"b\";s:12:\"culto.manage\";s:1:\"c\";s:3:\"web\";s:1:\"r\";a:4:{i:0;i:1;i:1;i:2;i:2;i:3;i:3;i:6;}}}s:5:\"roles\";a:6:{i:0;a:3:{s:1:\"a\";i:1;s:1:\"b\";s:5:\"admin\";s:1:\"c\";s:3:\"web\";}i:1;a:3:{s:1:\"a\";i:2;s:1:\"b\";s:10:\"secretaria\";s:1:\"c\";s:3:\"web\";}i:2;a:3:{s:1:\"a\";i:3;s:1:\"b\";s:6:\"pastor\";s:1:\"c\";s:3:\"web\";}i:3;a:3:{s:1:\"a\";i:5;s:1:\"b\";s:16:\"lider_ministerio\";s:1:\"c\";s:3:\"web\";}i:4;a:3:{s:1:\"a\";i:6;s:1:\"b\";s:11:\"super_admin\";s:1:\"c\";s:3:\"web\";}i:5;a:3:{s:1:\"a\";i:4;s:1:\"b\";s:10:\"financeiro\";s:1:\"c\";s:3:\"web\";}}}',1773644273);
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `church_services`
--

DROP TABLE IF EXISTS `church_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `church_services` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned NOT NULL,
  `day_of_week` tinyint(3) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time DEFAULT NULL,
  `sort_order` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `church_services_church_id_foreign` (`church_id`),
  CONSTRAINT `church_services_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `church_services`
--

LOCK TABLES `church_services` WRITE;
/*!40000 ALTER TABLE `church_services` DISABLE KEYS */;
/*!40000 ALTER TABLE `church_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `churches`
--

DROP TABLE IF EXISTS `churches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `churches` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'Nova Semente',
  `slug` varchar(255) NOT NULL DEFAULT 'nova-semente',
  `logo_url` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `whatsapp` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `pix_key` varchar(255) DEFAULT NULL,
  `donation_url` varchar(255) DEFAULT NULL,
  `youtube_playlist_url` varchar(512) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `churches_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `churches`
--

LOCK TABLES `churches` WRITE;
/*!40000 ALTER TABLE `churches` DISABLE KEYS */;
INSERT INTO `churches` VALUES (1,'2026-03-05 06:46:44','2026-03-15 07:52:32','Nova Semente','nova-semente','logos/SZiyX8eYLTnYArt0BtIfcuyywLZX2QNOiwbnHLVV.webp',NULL,NULL,NULL,'Primeira igreja a utilizar o sistema New Church.',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1);
/*!40000 ALTER TABLE `churches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cultos`
--

DROP TABLE IF EXISTS `cultos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cultos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `youtube_url` varchar(512) NOT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cultos_church_id_foreign` (`church_id`),
  KEY `cultos_created_by_foreign` (`created_by`),
  CONSTRAINT `cultos_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cultos_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cultos`
--

LOCK TABLES `cultos` WRITE;
/*!40000 ALTER TABLE `cultos` DISABLE KEYS */;
INSERT INTO `cultos` VALUES (1,1,'Soberano - Ep. 6 - Contrariando a Lógica Humana | Pr. Anderson Salvador I Nova Semente','https://www.youtube.com/watch?v=xkshvrecI2o','2026-03-14 17:53:00',1,'2026-03-15 00:53:49','2026-03-15 00:53:49');
/*!40000 ALTER TABLE `cultos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT 0,
  `location` varchar(255) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `events_church_id_foreign` (`church_id`),
  KEY `events_created_by_foreign` (`created_by`),
  CONSTRAINT `events_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `events_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_transactions`
--

DROP TABLE IF EXISTS `financial_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `financial_transactions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `member_id` bigint(20) unsigned DEFAULT NULL,
  `type` enum('tithe','offering','donation','expense') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `date` date NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `financial_transactions_member_id_foreign` (`member_id`),
  CONSTRAINT `financial_transactions_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_transactions`
--

LOCK TABLES `financial_transactions` WRITE;
/*!40000 ALTER TABLE `financial_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `financial_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_checks`
--

DROP TABLE IF EXISTS `inventory_checks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_checks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inventory_session_id` bigint(20) unsigned NOT NULL,
  `inventory_item_id` bigint(20) unsigned NOT NULL,
  `checked_at` timestamp NULL DEFAULT NULL,
  `location_found` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'ok',
  `notes` text DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_checks_inventory_session_id_foreign` (`inventory_session_id`),
  KEY `inventory_checks_inventory_item_id_foreign` (`inventory_item_id`),
  KEY `inventory_checks_user_id_foreign` (`user_id`),
  CONSTRAINT `inventory_checks_inventory_item_id_foreign` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_checks_inventory_session_id_foreign` FOREIGN KEY (`inventory_session_id`) REFERENCES `inventory_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_checks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_checks`
--

LOCK TABLES `inventory_checks` WRITE;
/*!40000 ALTER TABLE `inventory_checks` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_checks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `barcode` varchar(100) NOT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `item_type` varchar(255) DEFAULT NULL,
  `classification` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `acquisition_date` date DEFAULT NULL,
  `acquisition_value` decimal(12,2) DEFAULT NULL,
  `current_value` decimal(12,2) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_items_barcode_unique` (`barcode`),
  KEY `inventory_items_church_id_foreign` (`church_id`),
  CONSTRAINT `inventory_items_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items`
--

LOCK TABLES `inventory_items` WRITE;
/*!40000 ALTER TABLE `inventory_items` DISABLE KEYS */;
INSERT INTO `inventory_items` VALUES (1,1,'0A239QBW505407','0A239QBW505407','Notebook Samsung Book Ci5 8GB 256SSD Intel Iris Xe W11 Prateado','Eletrônicos','Samsung','Notebook','Franquia',NULL,NULL,'2025-03-01',329.90,329.90,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(2,1,'DHM4KL00M','DHM4KL00M','MacBook Pro M2 16GB SSD 512GB Tela 14 Cinza','Eletrônicos','Apple','Notebook','Franquia',NULL,NULL,'2025-03-01',16858.94,1695.89,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(3,1,'1124001749','1124001749','Lente RF24-70 2.8','Equipamentos','Canon','Lente','Básico',NULL,NULL,'2025-03-01',21300.00,745.50,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(4,1,'302227000626','302227000626','Canon EOS R R5 Mirrorless Preto','Eletrônicos','Canon','Camera','Franquia',NULL,NULL,'2025-03-01',20200.00,2820.00,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(5,1,'21BRAEEY01061','21BRAEEY01061','Stagebox RIO3224-02','Equipamentos','Yamaha','Stagebox','Básico',NULL,NULL,'2025-03-01',60542.50,1968.05,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(6,1,'21BRAEEY01059','21BRAEEY01059','Stagebox RIO3224-02','Equipamentos','Yamaha','Stagebox','Básico',NULL,NULL,'2025-03-01',60542.50,1968.05,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(7,1,'2112130724001016','2112130724001016','Amplificador de Potência Digital 03NXAMP4X4MK2','Eletrônicos','Nexo','Amplifica','Básico',NULL,NULL,'2025-03-01',79964.18,2600.03,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(8,1,'2130840824A00294','2130840824A00294','Interface Digital Nexo NXAED','Equipamentos','Nexo','Interface','Básico',NULL,NULL,'2025-03-01',4790.74,155.73,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(9,1,'213385100430','213385100430','Caixa Acústica Passiva 01120','Eletrônicos','Nexo','Caixa de S','Básico',NULL,NULL,'2025-03-01',28210.97,917.05,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(10,1,'213385100428','213385100428','Caixa Acústica Passiva 01120','Eletrônicos','Nexo','Caixa de S','Básico',NULL,NULL,'2025-03-01',28210.97,917.05,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(11,1,'213392100436','213392100436','Caixa Acústica Passiva 01P18','Eletrônicos','Nexo','Caixa de S','Básico',NULL,NULL,'2025-03-01',29184.71,948.70,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(12,1,'213392100421','213392100421','Caixa Acústica Passiva 01P18','Eletrônicos','Nexo','Caixa de S','Básico',NULL,NULL,'2025-03-01',29184.71,948.70,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(13,1,'26701233AJ','26701233AJ','Comutador de Rede Yamaha SWR2310-10G','Eletrônicos','Yamaha','Switcher','Básico',NULL,NULL,'2025-03-01',4868.36,158.26,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(14,1,'26701217Al','26701217Al','Comutador de Rede Yamaha SWR2310-10G','Eletrônicos','Yamaha','Switcher','Básico',NULL,NULL,'2025-03-01',4868.36,158.26,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(15,1,'26701274AJ','26701274AJ','Comutador de Rede Yamaha SWR2310-10G','Eletrônicos','Yamaha','Switcher','Básico',NULL,NULL,'2025-03-01',4868.36,158.26,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(16,1,'26701213AJ','26701213AJ','Comutador de Rede Yamaha SWR2310-10G','Eletrônicos','Yamaha','Switcher','Básico',NULL,NULL,'2025-03-01',4868.36,158.26,'active','2026-03-05 07:34:14','2026-03-05 07:34:14'),(17,1,'21BRAGEZ01015','21BRAGEZ01015','MISTURADOR DE SOM DIGITAL YAMAHA DM7','Eletrônicos','Yamaha','Mesa de S','Básico',NULL,NULL,'2025-03-01',178645.00,5824.32,'active','2026-03-05 07:34:14','2026-03-05 07:34:14');
/*!40000 ALTER TABLE `inventory_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_movements`
--

DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_movements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inventory_item_id` bigint(20) unsigned NOT NULL,
  `type` varchar(20) NOT NULL,
  `from_location` varchar(255) DEFAULT NULL,
  `to_location` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_movements_inventory_item_id_foreign` (`inventory_item_id`),
  KEY `inventory_movements_user_id_foreign` (`user_id`),
  CONSTRAINT `inventory_movements_inventory_item_id_foreign` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_movements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_movements`
--

LOCK TABLES `inventory_movements` WRITE;
/*!40000 ALTER TABLE `inventory_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_sessions`
--

DROP TABLE IF EXISTS `inventory_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_sessions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `scheduled_date` date DEFAULT NULL,
  `responsible_user_id` bigint(20) unsigned DEFAULT NULL,
  `ministry_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'open',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_sessions_church_id_foreign` (`church_id`),
  KEY `inventory_sessions_responsible_user_id_foreign` (`responsible_user_id`),
  KEY `inventory_sessions_ministry_id_foreign` (`ministry_id`),
  CONSTRAINT `inventory_sessions_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_sessions_ministry_id_foreign` FOREIGN KEY (`ministry_id`) REFERENCES `ministries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `inventory_sessions_responsible_user_id_foreign` FOREIGN KEY (`responsible_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_sessions`
--

LOCK TABLES `inventory_sessions` WRITE;
/*!40000 ALTER TABLE `inventory_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invitations`
--

DROP TABLE IF EXISTS `invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invitations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invitations_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invitations`
--

LOCK TABLES `invitations` WRITE;
/*!40000 ALTER TABLE `invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members`
--

DROP TABLE IF EXISTS `members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `members` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `members_church_id_foreign` (`church_id`),
  CONSTRAINT `members_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members`
--

LOCK TABLES `members` WRITE;
/*!40000 ALTER TABLE `members` DISABLE KEYS */;
INSERT INTO `members` VALUES (1,NULL,'Antonio Natanael de Paiva',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(2,NULL,'Davi Ferronato',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(3,NULL,'Rogério Ferreira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(4,NULL,'Alexandre Romano',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(5,NULL,'Geraldo Medeiros',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(6,NULL,'Marcio Preto',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(7,NULL,'Gil Ribeiro Chaves',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(8,NULL,'Ronaldo Oliveira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:44','2026-03-05 06:12:44'),(9,NULL,'Mauro Morbin da Cunha',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(10,NULL,'Rivaldo Alencar Dos Santos',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(11,NULL,'Lucas Doyle',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(12,NULL,'Ricardo Salomão',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(13,NULL,'Ivan Domingues',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(14,NULL,'Carlos Moura',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(15,NULL,'Gilberto Ramos',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(16,NULL,'José Alberto Ferreira Vicente',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(17,NULL,'Artur João Ferreira Filho',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(18,NULL,'Aslam Kildare Alberti',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(19,NULL,'Sidney de Oliveira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(20,NULL,'Matheus Ferreira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(21,NULL,'Marco Antônio Bregalante',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 06:12:45','2026-03-05 06:12:45'),(22,1,'Antonio Natanael de Paiva',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(23,1,'Davi Ferronato',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(24,1,'Rogério Ferreira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(25,1,'Alexandre Romano',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(26,1,'Geraldo Medeiros',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(27,1,'Marcio Preto',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(28,1,'Gil Ribeiro Chaves',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(29,1,'Ronaldo Oliveira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(30,1,'Mauro Morbin da Cunha',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(31,1,'Rivaldo Alencar Dos Santos',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(32,1,'Lucas Doyle',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(33,1,'Ricardo Salomão',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(34,1,'Ivan Domingues',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(35,1,'Carlos Moura',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(36,1,'Gilberto Ramos',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(37,1,'José Alberto Ferreira Vicente',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(38,1,'Artur João Ferreira Filho',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(39,1,'Aslam Kildare Alberti',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(40,1,'Sidney de Oliveira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(41,1,'Matheus Ferreira',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(42,1,'Marco Antônio Bregalante',NULL,NULL,NULL,NULL,NULL,'active','2026-03-05 07:46:20','2026-03-05 07:46:20'),(43,NULL,'Ella Parker',NULL,'maudie.mcclure@example.net','669.558.6892','1976-02-13','537 Kaya Throughway Apt. 442\nWest Clemensmouth, TX 21227-5666','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(44,NULL,'Hilda Okuneva',NULL,'magali59@example.net','1-325-386-6603','2021-09-29','315 Koss Keys Suite 804\nNew Jazmynefurt, CT 07114','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(45,NULL,'Mireya Ritchie',NULL,'vlubowitz@example.com','+1 (585) 478-6744','2006-11-15','3310 Greenfelder Shoals Suite 601\nPort Tylerport, UT 81079','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(46,NULL,'Leopoldo Cummerata',NULL,'lucinda81@example.org','(864) 986-7272','1983-01-19','59302 Floyd Parks\nPeteborough, DE 99478','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(47,NULL,'Ms. Greta Effertz',NULL,'marina.turcotte@example.net','+1 (678) 362-7743','2020-04-07','5086 Schulist Key Suite 736\nPort Issacton, NV 32436','inactive','2026-03-08 13:51:39','2026-03-08 13:51:39'),(48,NULL,'Clemmie Medhurst',NULL,'wkuphal@example.com','513.406.5503','2017-11-07','69973 Jamal Glen\nNew Noelia, VT 39758-6270','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(49,NULL,'Prof. Anika Nienow MD',NULL,'brooklyn.kertzmann@example.com','(228) 488-5931','1981-04-15','579 Jacobs Junction Suite 322\nWest Vitamouth, IL 56445','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(50,NULL,'Katrine Walker',NULL,'jacobson.maurine@example.org','602.553.1818','2011-02-01','93928 Littel Villages Suite 904\nWolfburgh, TX 48100','inactive','2026-03-08 13:51:39','2026-03-08 13:51:39'),(51,NULL,'Prof. Candida Fahey',NULL,'cdurgan@example.com','+1.984.926.7255','1991-02-07','53589 Sylvester Center\nReichertberg, AL 60125-2346','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(52,NULL,'Jacynthe Funk',NULL,'edd91@example.com','283-307-9461','2021-03-05','5618 Deion Ports Suite 643\nDamianfurt, MD 17296','inactive','2026-03-08 13:51:39','2026-03-08 13:51:39'),(53,NULL,'Camilla Borer',NULL,'ray29@example.com','(956) 918-1180','2024-12-28','42206 Jean Station Apt. 343\nWinstonton, NY 34889-8950','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(54,NULL,'Janet Kohler Sr.',NULL,'precious.stoltenberg@example.com','+1.585.779.9531','1999-08-02','5436 Crystal Mountains\nEast Kiannashire, CT 06340-5387','active','2026-03-08 13:51:39','2026-03-08 13:51:39'),(55,NULL,'Mrs. Rubye Bednar',NULL,'tyrell.ziemann@example.com','1-629-818-1548','2010-03-12','295 Lucie Manor\nEast Oscarberg, OH 95814-9371','inactive','2026-03-08 13:51:39','2026-03-08 13:51:39'),(56,NULL,'Ernestine Leffler',NULL,'greenholt.earlene@example.com','484-282-9935','2005-06-08','71027 Letha Pass\nOrnmouth, NJ 50570-7549','inactive','2026-03-08 13:51:39','2026-03-08 13:51:39'),(57,NULL,'Camden O\'Kon II',NULL,'myrtie.koelpin@example.net','+1-757-700-1659','2008-07-26','21162 Weber Trace\nSouth Ashtynton, NM 05954','inactive','2026-03-08 13:51:39','2026-03-08 13:51:39');
/*!40000 ALTER TABLE `members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_03_02_015518_create_permission_tables',1),(5,'2026_03_02_020401_create_churches_table',1),(6,'2026_03_02_025132_create_members_table',1),(7,'2026_03_02_030000_create_ministries_table',1),(8,'2026_03_02_030100_create_volunteers_table',1),(9,'2026_03_02_030200_create_rooms_table',1),(10,'2026_03_02_030300_create_services_table',1),(11,'2026_03_02_030400_create_service_schedules_table',1),(12,'2026_03_02_030500_create_financial_transactions_table',1),(13,'2026_03_04_000001_create_schedule_roles_table',2),(14,'2026_03_04_000002_create_schedule_assignments_table',2),(15,'2026_03_04_000003_create_schedule_checkin_dates_table',3),(16,'2026_03_05_000001_add_ministry_id_to_schedule_assignments_table',4),(17,'2026_03_05_011943_add_optional_member_and_name_to_volunteers_table',5),(18,'2026_03_05_011944_add_floor_to_rooms_table',5),(19,'2026_03_05_012220_create_inventory_items_table',5),(20,'2026_03_05_012220_create_inventory_movements_table',5),(21,'2026_03_05_014239_add_photo_url_to_members_table',6),(22,'2026_03_05_014404_add_member_id_to_users_table',6),(23,'2026_03_05_020359_add_recurring_to_schedule_assignments_table',7),(24,'2026_03_05_020535_create_ministry_volunteer_table',7),(25,'2026_03_05_023622_create_invitations_table',8),(26,'2026_03_05_025135_add_icon_to_ministries_table',9),(27,'2026_03_06_000001_add_fields_to_churches_table',10),(28,'2026_03_06_000002_create_news_table',11),(29,'2026_03_07_000001_add_church_id_to_entities',12),(30,'2026_03_07_000002_add_planilha_fields_to_inventory_items',12),(31,'2026_03_07_000003_create_inventory_sessions_and_checks',12),(32,'2026_03_10_000001_create_events_table',13),(33,'2026_03_05_100000_add_contact_and_donation_to_churches',14),(34,'2026_03_05_100001_create_church_services_table',14),(35,'2026_03_05_120000_create_ministry_user_table',15),(36,'2026_03_06_100000_create_cultos_table',16),(37,'2026_03_14_000001_create_acervo_items_table',17),(38,'2026_03_05_000001_reverse_acervo_items_created_at',18),(39,'2026_03_14_000001_add_youtube_playlist_url_to_churches_table',19),(40,'2026_03_14_000002_reverse_acervo_items_created_at',19);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ministries`
--

DROP TABLE IF EXISTS `ministries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ministries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `icon` varchar(40) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ministries_church_id_foreign` (`church_id`),
  CONSTRAINT `ministries_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ministries`
--

LOCK TABLES `ministries` WRITE;
/*!40000 ALTER TABLE `ministries` DISABLE KEYS */;
INSERT INTO `ministries` VALUES (1,NULL,'Louvor',NULL,NULL,'2026-03-05 03:40:49','2026-03-05 03:40:49'),(2,NULL,'Portaria',NULL,NULL,'2026-03-05 03:40:49','2026-03-05 03:40:49'),(3,NULL,'Som',NULL,NULL,'2026-03-05 03:40:49','2026-03-05 03:40:49'),(4,NULL,'Intercessão',NULL,NULL,'2026-03-05 03:40:49','2026-03-05 03:40:49'),(5,NULL,'Crianças',NULL,NULL,'2026-03-05 03:40:49','2026-03-05 03:40:49'),(6,NULL,'Recepção',NULL,NULL,'2026-03-05 03:40:49','2026-03-05 03:40:49'),(7,NULL,'Midia',NULL,NULL,'2026-03-05 03:40:49','2026-03-05 03:40:49'),(8,1,'Diáconos','user_group',NULL,'2026-03-05 06:12:44','2026-03-05 07:45:54'),(9,1,'Câmeras','heart',NULL,'2026-03-05 18:16:47','2026-03-05 18:17:01'),(10,1,'Recepção','inbox',NULL,'2026-03-05 21:52:00','2026-03-05 21:52:00');
/*!40000 ALTER TABLE `ministries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ministry_user`
--

DROP TABLE IF EXISTS `ministry_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ministry_user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `ministry_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ministry_user_user_id_ministry_id_unique` (`user_id`,`ministry_id`),
  KEY `ministry_user_ministry_id_foreign` (`ministry_id`),
  CONSTRAINT `ministry_user_ministry_id_foreign` FOREIGN KEY (`ministry_id`) REFERENCES `ministries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ministry_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ministry_user`
--

LOCK TABLES `ministry_user` WRITE;
/*!40000 ALTER TABLE `ministry_user` DISABLE KEYS */;
INSERT INTO `ministry_user` VALUES (1,3,8,'2026-03-08 14:34:20','2026-03-08 14:34:20');
/*!40000 ALTER TABLE `ministry_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ministry_volunteer`
--

DROP TABLE IF EXISTS `ministry_volunteer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ministry_volunteer` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `volunteer_id` bigint(20) unsigned NOT NULL,
  `ministry_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ministry_volunteer_volunteer_id_ministry_id_unique` (`volunteer_id`,`ministry_id`),
  KEY `ministry_volunteer_ministry_id_foreign` (`ministry_id`),
  CONSTRAINT `ministry_volunteer_ministry_id_foreign` FOREIGN KEY (`ministry_id`) REFERENCES `ministries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ministry_volunteer_volunteer_id_foreign` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ministry_volunteer`
--

LOCK TABLES `ministry_volunteer` WRITE;
/*!40000 ALTER TABLE `ministry_volunteer` DISABLE KEYS */;
INSERT INTO `ministry_volunteer` VALUES (1,1,8,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(2,2,8,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(3,3,8,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(4,4,8,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(5,5,8,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(6,6,8,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(7,7,8,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(8,8,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(9,9,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(10,10,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(11,11,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(12,12,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(13,13,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(14,14,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(15,15,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(16,16,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(17,17,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(18,18,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(19,19,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(20,20,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(21,21,8,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(22,22,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(23,23,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(24,24,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(25,25,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(26,26,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(27,27,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(28,28,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(29,29,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(30,30,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(31,31,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(32,32,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(33,33,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(34,34,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(35,35,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(36,36,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(37,37,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(38,38,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(39,39,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(40,40,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(41,41,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(42,42,8,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(43,1,2,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(44,2,1,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(45,3,4,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(46,4,2,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(47,5,6,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(48,6,3,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(49,7,5,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(50,8,10,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(51,9,2,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(52,10,5,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(53,11,3,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(54,12,6,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(55,3,7,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(56,4,1,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(57,5,7,'2026-03-08 13:51:39','2026-03-08 13:51:39'),(58,6,6,'2026-03-08 13:51:39','2026-03-08 13:51:39');
/*!40000 ALTER TABLE `ministry_volunteer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `model_has_permissions`
--

DROP TABLE IF EXISTS `model_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `model_has_permissions` (
  `permission_id` bigint(20) unsigned NOT NULL,
  `model_type` varchar(255) NOT NULL,
  `model_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `model_has_permissions`
--

LOCK TABLES `model_has_permissions` WRITE;
/*!40000 ALTER TABLE `model_has_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `model_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `model_has_roles`
--

DROP TABLE IF EXISTS `model_has_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `model_has_roles` (
  `role_id` bigint(20) unsigned NOT NULL,
  `model_type` varchar(255) NOT NULL,
  `model_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `model_has_roles`
--

LOCK TABLES `model_has_roles` WRITE;
/*!40000 ALTER TABLE `model_has_roles` DISABLE KEYS */;
INSERT INTO `model_has_roles` VALUES (1,'App\\Models\\User',1),(5,'App\\Models\\User',3),(6,'App\\Models\\User',1);
/*!40000 ALTER TABLE `model_has_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `news` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `excerpt` varchar(255) DEFAULT NULL,
  `body` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `news_slug_unique` (`slug`),
  KEY `news_church_id_foreign` (`church_id`),
  KEY `news_created_by_foreign` (`created_by`),
  CONSTRAINT `news_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `news_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news`
--

LOCK TABLES `news` WRITE;
/*!40000 ALTER TABLE `news` DISABLE KEYS */;
INSERT INTO `news` VALUES (1,1,'Novos discípulos para Cristo','novos-discipulos-para-cristo',NULL,'Graças aos esforços realizados, na IASD Huancayo Central (que pertence ao território administrativo da Missão Central do Peru, uma sede administrativa da denominação), pessoas surdas decidiram ser batizadas. É o caso de María Hurtado, uma mãe que encontrou no estudo bíblico o mandamento referente à guarda do sábado. O mesmo ocorreu com Rosember Zamora, um homem que encontrou uma nova oportunidade de vida servindo a Deus na Rede de Educação Adventista.\r\n\r\nA dedicação de Lisset ajuda a levar a mensagem bíblica a uma comunidade que muitas vezes enfrenta barreiras de comunicação. Para ela, a língua de sinais não é apenas uma ferramenta de interpretação, mas uma ponte que permite que mais pessoas conheçam a mensagem de esperança do evangelho.','http://localhost:8000/storage/news/MJu36pFHMVS6r8hU33PugqOT6Lgg34TqlC63MLU7.jpg','2026-03-15 03:19:00',1,'2026-03-15 03:19:58','2026-03-15 03:20:09');
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `guard_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'members.view','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(2,'members.manage','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(3,'volunteers.view','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(4,'volunteers.manage','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(5,'rooms.view','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(6,'rooms.manage','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(7,'finance.view','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(8,'finance.manage','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(9,'escalas.view','web','2026-03-05 02:39:50','2026-03-05 02:39:50'),(10,'escalas.manage','web','2026-03-05 02:39:50','2026-03-05 02:39:50'),(11,'departments.view','web','2026-03-05 03:44:59','2026-03-05 03:44:59'),(12,'departments.manage','web','2026-03-05 03:44:59','2026-03-05 03:44:59'),(13,'inventory.view','web','2026-03-05 04:25:02','2026-03-05 04:25:02'),(14,'inventory.manage','web','2026-03-05 04:25:02','2026-03-05 04:25:02'),(15,'users.view','web','2026-03-05 05:40:05','2026-03-05 05:40:05'),(16,'users.manage','web','2026-03-05 05:40:05','2026-03-05 05:40:05'),(17,'churches.manage','web','2026-03-05 06:52:02','2026-03-05 06:52:02'),(18,'news.view','web','2026-03-05 06:52:02','2026-03-05 06:52:02'),(19,'news.manage','web','2026-03-05 06:52:02','2026-03-05 06:52:02'),(20,'events.view','web','2026-03-08 13:50:01','2026-03-08 13:50:01'),(21,'events.manage','web','2026-03-08 13:50:01','2026-03-08 13:50:01'),(22,'roles.manage','web','2026-03-08 13:50:01','2026-03-08 13:50:01'),(23,'culto.manage','web','2026-03-15 00:33:39','2026-03-15 00:33:39');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_has_permissions`
--

DROP TABLE IF EXISTS `role_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_has_permissions` (
  `permission_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_has_permissions`
--

LOCK TABLES `role_has_permissions` WRITE;
/*!40000 ALTER TABLE `role_has_permissions` DISABLE KEYS */;
INSERT INTO `role_has_permissions` VALUES (1,1),(1,2),(1,3),(1,5),(1,6),(2,1),(2,2),(2,6),(3,1),(3,2),(3,3),(3,5),(3,6),(4,1),(4,2),(4,6),(5,1),(5,2),(5,3),(5,5),(5,6),(6,1),(6,2),(6,6),(7,1),(7,3),(7,4),(7,6),(8,1),(8,4),(8,6),(9,1),(9,2),(9,3),(9,5),(9,6),(10,1),(10,2),(10,5),(10,6),(11,1),(11,2),(11,3),(11,5),(11,6),(12,1),(12,2),(12,6),(13,1),(13,2),(13,3),(13,5),(13,6),(14,1),(14,2),(14,6),(15,1),(15,2),(15,6),(16,1),(16,2),(16,6),(17,1),(17,6),(18,1),(18,2),(18,3),(18,5),(18,6),(19,1),(19,2),(19,6),(20,1),(20,2),(20,3),(20,4),(20,5),(20,6),(21,1),(21,2),(21,3),(21,6),(22,1),(22,6),(23,1),(23,2),(23,3),(23,6);
/*!40000 ALTER TABLE `role_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `guard_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(2,'secretaria','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(3,'pastor','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(4,'financeiro','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(5,'lider_ministerio','web','2026-03-03 00:13:38','2026-03-03 00:13:38'),(6,'super_admin','web','2026-03-05 06:52:02','2026-03-05 06:52:02');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rooms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `church_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `floor` varchar(20) NOT NULL DEFAULT 'terreo',
  `location` varchar(255) DEFAULT NULL,
  `capacity` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `rooms_church_id_foreign` (`church_id`),
  CONSTRAINT `rooms_church_id_foreign` FOREIGN KEY (`church_id`) REFERENCES `churches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rooms`
--

LOCK TABLES `rooms` WRITE;
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` VALUES (1,NULL,'Sala 1','primeiro','Corredor Esquerdo',20,'2026-03-05 04:35:35','2026-03-05 04:35:35');
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_assignments`
--

DROP TABLE IF EXISTS `schedule_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schedule_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ministry_id` bigint(20) unsigned DEFAULT NULL,
  `member_id` bigint(20) unsigned NOT NULL,
  `schedule_role_id` bigint(20) unsigned DEFAULT NULL,
  `saturday_number` tinyint(3) unsigned DEFAULT NULL,
  `schedule_date` date DEFAULT NULL,
  `recurring` tinyint(1) NOT NULL DEFAULT 1,
  `assignment_month` tinyint(3) unsigned DEFAULT NULL,
  `assignment_year` smallint(5) unsigned DEFAULT NULL,
  `status` enum('pending','confirmed','refused') NOT NULL DEFAULT 'pending',
  `start_time` varchar(255) DEFAULT NULL,
  `end_time` varchar(255) DEFAULT NULL,
  `checked_in_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedule_assignments_member_id_foreign` (`member_id`),
  KEY `schedule_assignments_schedule_role_id_foreign` (`schedule_role_id`),
  KEY `schedule_assignments_saturday_number_schedule_date_index` (`saturday_number`,`schedule_date`),
  KEY `schedule_assignments_ministry_id_foreign` (`ministry_id`),
  CONSTRAINT `schedule_assignments_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `schedule_assignments_ministry_id_foreign` FOREIGN KEY (`ministry_id`) REFERENCES `ministries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `schedule_assignments_schedule_role_id_foreign` FOREIGN KEY (`schedule_role_id`) REFERENCES `schedule_roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_assignments`
--

LOCK TABLES `schedule_assignments` WRITE;
/*!40000 ALTER TABLE `schedule_assignments` DISABLE KEYS */;
INSERT INTO `schedule_assignments` VALUES (1,8,1,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(2,8,2,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(3,8,3,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(4,8,4,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(5,8,5,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(6,8,6,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(7,8,7,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(8,8,8,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(9,8,9,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(10,8,10,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(11,8,11,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(12,8,12,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(13,8,13,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(14,8,14,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(15,8,15,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(16,8,16,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(17,8,17,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(18,8,18,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(19,8,19,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(20,8,20,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(21,8,21,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(22,8,22,7,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(23,8,23,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(24,8,24,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(25,8,25,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(26,8,26,NULL,1,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(27,8,27,7,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(28,8,28,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(29,8,29,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(30,8,30,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(31,8,31,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(32,8,32,NULL,2,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(33,8,33,7,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(34,8,34,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(35,8,35,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(36,8,36,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(37,8,37,NULL,3,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(38,8,38,7,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(39,8,39,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(40,8,40,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(41,8,41,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(42,8,42,NULL,4,NULL,1,NULL,NULL,'pending',NULL,NULL,NULL,'2026-03-05 07:46:20','2026-03-05 07:46:20');
/*!40000 ALTER TABLE `schedule_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_checkin_dates`
--

DROP TABLE IF EXISTS `schedule_checkin_dates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schedule_checkin_dates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `schedule_date` date NOT NULL,
  `enabled_by` bigint(20) unsigned DEFAULT NULL,
  `enabled_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedule_checkin_dates_schedule_date_unique` (`schedule_date`),
  KEY `schedule_checkin_dates_enabled_by_foreign` (`enabled_by`),
  CONSTRAINT `schedule_checkin_dates_enabled_by_foreign` FOREIGN KEY (`enabled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_checkin_dates`
--

LOCK TABLES `schedule_checkin_dates` WRITE;
/*!40000 ALTER TABLE `schedule_checkin_dates` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_checkin_dates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_roles`
--

DROP TABLE IF EXISTS `schedule_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schedule_roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_roles`
--

LOCK TABLES `schedule_roles` WRITE;
/*!40000 ALTER TABLE `schedule_roles` DISABLE KEYS */;
INSERT INTO `schedule_roles` VALUES (1,'Portaria','2026-03-05 02:34:52','2026-03-05 02:34:52'),(2,'Som','2026-03-05 02:34:52','2026-03-05 02:34:52'),(3,'Recepção','2026-03-05 02:34:52','2026-03-05 02:34:52'),(4,'Intercessão','2026-03-05 02:34:52','2026-03-05 02:34:52'),(5,'Louvor','2026-03-05 02:34:52','2026-03-05 02:34:52'),(6,'Oferta','2026-03-05 02:34:52','2026-03-05 02:34:52'),(7,'Coordenador','2026-03-05 07:45:54','2026-03-05 07:45:54');
/*!40000 ALTER TABLE `schedule_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_schedules`
--

DROP TABLE IF EXISTS `service_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_schedules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `service_id` bigint(20) unsigned NOT NULL,
  `volunteer_id` bigint(20) unsigned NOT NULL,
  `position` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `service_schedules_service_id_foreign` (`service_id`),
  KEY `service_schedules_volunteer_id_foreign` (`volunteer_id`),
  CONSTRAINT `service_schedules_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_schedules_volunteer_id_foreign` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_schedules`
--

LOCK TABLES `service_schedules` WRITE;
/*!40000 ALTER TABLE `service_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `services` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `room_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `services_room_id_foreign` (`room_id`),
  CONSTRAINT `services_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('HcsDEmoKFOYpQ6RDBWpYYALO8Y1w28DZN0AMo7kQ',NULL,'127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.5.26 Chrome/142.0.7444.265 Electron/39.4.0 Safari/537.36','YTo0OntzOjY6Il90b2tlbiI7czo0MDoiMUJUN1NyVkJlT1hjYlh5TXZTT3UwVllNSmtFZDhLQzdFemZxZEVjaCI7czozOiJ1cmwiO2E6MTp7czo4OiJpbnRlbmRlZCI7czoyOToiaHR0cDovLzEyNy4wLjAuMTo4MDAwL21lbWJlcnMiO31zOjk6Il9wcmV2aW91cyI7YToyOntzOjM6InVybCI7czoyNzoiaHR0cDovLzEyNy4wLjAuMTo4MDAwL2xvZ2luIjtzOjU6InJvdXRlIjtzOjU6ImxvZ2luIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==',1772487315),('Xyr4BiEYYaOuPnLCcDCkTZ4LFmuQ4t0f0o7tH0Qx',1,'127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36','YTo0OntzOjY6Il90b2tlbiI7czo0MDoiU1VpN2lpd01Ud21vdVZsY05oUk5ZcEhhd2VBRGU4YW5NRzBhelVJWCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjk6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9tZW1iZXJzIjtzOjU6InJvdXRlIjtzOjEzOiJtZW1iZXJzLmluZGV4Ijt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo1MDoibG9naW5fd2ViXzU5YmEzNmFkZGMyYjJmOTQwMTU4MGYwMTRjN2Y1OGVhNGUzMDk4OWQiO2k6MTt9',1772669673),('ZF7kMyBzHDUi0m3gHvCpcLBEK2UrJiSG5dWVq5f6',1,'127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36','YTo0OntzOjY6Il90b2tlbiI7czo0MDoiWDNLb1hXN1N1YmNUekw5YTZTTUdZaFJKSkRjVHU0TjhBV1ZYbGd1bSI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjc6Imh0dHA6Ly8xMjcuMC4wLjE6ODAwMC9sb2dpbiI7czo1OiJyb3V0ZSI7czo1OiJsb2dpbiI7fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjE7fQ==',1772488750);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `member_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_member_id_foreign` (`member_id`),
  CONSTRAINT `users_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,NULL,'Admin','admin@example.com','2026-03-03 00:13:38','$2y$12$eiNcXX9dc8AM9FuwxfhU9eq45XUmzi56awrQXMYW/t/BbkWuBQ7sK','RxWKkqlHmZAybIEgSY0gkjctzLAhHufTCzUlqEKfaqhabBMouNLLcua4wlGK','2026-03-03 00:13:38','2026-03-08 13:51:40'),(3,NULL,'Ivan','idomingues2000@gmail.com',NULL,'$2y$12$NxjDYD16t4cjsYzyb1ubyeaU9pfbz4b2Xc01Cp3lJI51WPjp15c4G',NULL,'2026-03-08 14:02:02','2026-03-08 14:02:02');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `volunteers`
--

DROP TABLE IF EXISTS `volunteers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `volunteers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `member_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `volunteers_member_id_foreign` (`member_id`),
  CONSTRAINT `volunteers_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `volunteers`
--

LOCK TABLES `volunteers` WRITE;
/*!40000 ALTER TABLE `volunteers` DISABLE KEYS */;
INSERT INTO `volunteers` VALUES (1,1,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(2,2,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(3,3,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(4,4,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(5,5,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(6,6,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(7,7,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:44','2026-03-05 06:12:44'),(8,8,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(9,9,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(10,10,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(11,11,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(12,12,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(13,13,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(14,14,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(15,15,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(16,16,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(17,17,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(18,18,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(19,19,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(20,20,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(21,21,NULL,NULL,NULL,'Diácono',1,'2026-03-05 06:12:45','2026-03-05 06:12:45'),(22,22,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(23,23,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(24,24,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(25,25,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(26,26,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(27,27,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(28,28,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(29,29,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(30,30,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(31,31,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(32,32,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(33,33,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(34,34,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(35,35,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(36,36,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(37,37,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(38,38,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(39,39,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(40,40,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(41,41,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20'),(42,42,NULL,NULL,NULL,'Diácono',1,'2026-03-05 07:46:20','2026-03-05 07:46:20');
/*!40000 ALTER TABLE `volunteers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-15  0:40:40
