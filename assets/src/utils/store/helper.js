export default {
    hasStock( product, productCartQty = 0 ) {
        if ( ! product.manage_stock ) {
            return ( 'outofstock' == product.stock_status ) ? false : true;
        } else {
            if ( product.backorders_allowed ) {
                return true;
            } else {
                return product.stock_quantity > productCartQty;
            }
        }
    },
    apply_fixed_price_rules(fixed_price_rules, quantity) {
        var minDiscountQuantity = -1;

        if (fixed_price_rules) {
            Object.entries(fixed_price_rules).forEach(function([key, value]) {
                key = parseInt(key);

                if (key <= quantity && key > minDiscountQuantity) {
                    minDiscountQuantity = key;
                }
            });
        }

        return minDiscountQuantity;
    }
};
