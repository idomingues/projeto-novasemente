<?php

namespace App\Support;

use Illuminate\Database\QueryException;
use Illuminate\Database\SQLiteDatabaseDoesNotExistException;
use PDOException;
use Throwable;

/**
 * Identifica erros típicos de «não consigo ligar à BD» (para mostrar mensagem útil ao utilizador).
 */
final class ReportsDatabaseConnectionFailure
{
    public static function matches(Throwable $e): bool
    {
        if ($e instanceof SQLiteDatabaseDoesNotExistException) {
            return true;
        }

        $chain = [];
        $cur = $e;
        for ($i = 0; $i < 8 && $cur instanceof Throwable; $i++) {
            $chain[] = $cur;
            $cur = $cur->getPrevious();
        }

        foreach ($chain as $ex) {
            if ($ex instanceof SQLiteDatabaseDoesNotExistException) {
                return true;
            }
            $msg = strtolower($ex->getMessage());
            if ($ex instanceof PDOException) {
                if (str_contains($msg, 'could not find driver')) {
                    return true;
                }
                if (str_contains($msg, 'unable to open database file')) {
                    return true;
                }
                if (str_contains($msg, 'no such file or directory')) {
                    return true;
                }
            }
            if ($ex instanceof QueryException) {
                // Ligação MySQL recusada, socket, timeout, etc.
                if (str_contains($msg, 'connection refused')) {
                    return true;
                }
                if (str_contains($msg, 'connection timed out')) {
                    return true;
                }
                if (str_contains($msg, 'lost connection to mysql')) {
                    return true;
                }
                if (str_contains($msg, 'could not find driver')) {
                    return true;
                }
                if (str_contains($msg, 'no such file or directory')) {
                    return true;
                }
                if (str_contains($msg, 'unable to open database file')) {
                    return true;
                }
                if (preg_match('/sqlstate\[hy000\].*\[2002\]/i', $ex->getMessage())) {
                    return true;
                }
                if (preg_match('/sqlstate\[hy000\].*\[2006\]/i', $ex->getMessage())) {
                    return true;
                }
            }
        }

        return false;
    }
}
