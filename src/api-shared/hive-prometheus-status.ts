/** Response from GET /api/status/hive-prometheus */
export type HivePrometheusStatus =
    | { configured: false; }
    | {
        configured: true;
        reachable: boolean;
        /** Meaningful when reachable; high concurrent query load on Prometheus */
        overloaded: boolean;
    };
