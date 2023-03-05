<?php

namespace WeDevs\WePOS\Integrations\Kiosk;

use WC_Product_Simple;

class ProductsCreator {
    public static $kiosk_product_slug = 'wepos-kiosk';

    public static $products = [
        'wepos-kiosk' => [
            'title'      => 'Kiosk product',
            'price'      => 0,
            'attributes' => [],
            'visibility' => 'hidden',
        ],
    ];

    public static function create_products() {
        foreach ( self::$products as $product_slug => $product_data ) {
            if ( ! empty( get_page_by_path( $product_slug, OBJECT, 'product' ) ) ) {
                continue;
            }

            $product = new WC_Product_Simple();
            $product->set_description( '' );
            $product->set_name( $product_data['title'] );
            $product->set_slug( $product_slug );
            $product->set_sku( $product_slug );
            $product->set_price( $product_data['price'] );
            $product->set_regular_price( $product_data['price'] );
            $product->set_stock_status();
            $product->set_catalog_visibility( $product_data['visibility'] ?? 'visible' );
            $product->save();
        }
    }
}
