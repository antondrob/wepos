<?php
namespace WeDevs\WePOS\REST;

use WC_REST_Product_Categories_Controller;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Product API Controller
 */
class CategoriesController extends WC_REST_Product_Categories_Controller {

    /**
     * Endpoint namespace.
     *
     * @var string
     */
    protected $namespace = 'wepos/v1';
    /**
     * Get terms associated with a taxonomy.
     *
     * @param WP_REST_Request $request Full details about the request.
     * @return WP_REST_Response|WP_Error
     */
    public function get_items( $request ) {
        $taxonomy      = $this->get_taxonomy( $request );
        $prepared_args = array(
            'exclude'    => $request['exclude'],
            'include'    => $request['include'],
            'order'      => $request['order'],
            'orderby'    => $request['orderby'],
            'product'    => $request['product'],
            'hide_empty' => $request['hide_empty'],
            'number'     => $request['per_page'],
            'search'     => $request['search'],
            'slug'       => $request['slug'],
        );

        if ( ! empty( $request['offset'] ) ) {
            $prepared_args['offset'] = $request['offset'];
        } else {
            $prepared_args['offset'] = ( $request['page'] - 1 ) * $prepared_args['number'];
        }

        $taxonomy_obj = get_taxonomy( $taxonomy );

        if ( $taxonomy_obj->hierarchical && isset( $request['parent'] ) ) {
            if ( 0 === $request['parent'] ) {
                // Only query top-level terms.
                $prepared_args['parent'] = 0;
            } else {
                if ( $request['parent'] ) {
                    $prepared_args['parent'] = $request['parent'];
                }
            }
        }

        /**
         * Filter the query arguments, before passing them to `get_terms()`.
         *
         * Enables adding extra arguments or setting defaults for a terms
         * collection request.
         *
         * @see https://developer.wordpress.org/reference/functions/get_terms/
         *
         * @param array           $prepared_args Array of arguments to be
         *                                       passed to get_terms.
         * @param WP_REST_Request $request       The current request.
         */
        $prepared_args = apply_filters( "woocommerce_rest_{$taxonomy}_query", $prepared_args, $request );

        if ( ! empty( $prepared_args['product'] ) ) {
            $query_result = $this->get_terms_for_product( $prepared_args, $request );
            $total_terms  = $this->total_terms;
        } else {
            $query_result = get_terms( $taxonomy, $prepared_args );

            $count_args = $prepared_args;
            unset( $count_args['number'] );
            unset( $count_args['offset'] );
            $total_terms = wp_count_terms( $taxonomy, $count_args );

            // Ensure we don't return results when offset is out of bounds.
            // See https://core.trac.wordpress.org/ticket/35935.
            if ( $prepared_args['offset'] && $prepared_args['offset'] >= $total_terms ) {
                $query_result = array();
            }

            $most_popular_args = $prepared_args;
            $most_popular_args['meta_query'] = array(
              array(
                  'key' => '_wepos_most_popular',
                  'compare' => 'EXISTS',
              )
            );
            $query_result_most_popular = get_terms( $taxonomy, $most_popular_args );

            $query_result = array_merge($query_result_most_popular, $query_result);

            // wp_count_terms can return a falsy value when the term has no children.
            if ( ! $total_terms ) {
                $total_terms = 0;
            }
        }
        $response = array();
        foreach ( $query_result as $term ) {
            $data       = $this->prepare_item_for_response( $term, $request );
            $response[] = $this->prepare_response_for_collection( $data );
        }

        $response = rest_ensure_response( $response );

        // Store pagination values for headers then unset for count query.
        $per_page = (int) $prepared_args['number'];
        $page     = ceil( ( ( (int) $prepared_args['offset'] ) / $per_page ) + 1 );

        $response->header( 'X-WP-Total', (int) $total_terms );
        $max_pages = ceil( $total_terms / $per_page );
        $response->header( 'X-WP-TotalPages', (int) $max_pages );

        $base = str_replace( '(?P<attribute_id>[\d]+)', $request['attribute_id'], $this->rest_base );
        $base = add_query_arg( $request->get_query_params(), rest_url( '/' . $this->namespace . '/' . $base ) );
        if ( $page > 1 ) {
            $prev_page = $page - 1;
            if ( $prev_page > $max_pages ) {
                $prev_page = $max_pages;
            }
            $prev_link = add_query_arg( 'page', $prev_page, $base );
            $response->link_header( 'prev', $prev_link );
        }
        if ( $max_pages > $page ) {
            $next_page = $page + 1;
            $next_link = add_query_arg( 'page', $next_page, $base );
            $response->link_header( 'next', $next_link );
        }

        return $response;
    }
}

add_filter( 'woocommerce_rest_prepare_product_cat',function($response, $item, $request){
    $data = $response->get_data();
    $data['most_popular'] = !!get_term_meta( $item->term_id, '_wepos_most_popular', true );
    $response->set_data( $data );
    return $response;
}, 1000, 3);
